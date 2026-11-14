from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass, field

from breaker import stalled

FLAKY = 'flaky'
FIRST_ATTEMPT = 'first-attempt'
RETRIED = '(passed on retry; the first run on {device} failed)'
# AXe fails this way on a Simulator that has run for a while (backboardd near 200% CPU) and keeps failing on it until
# it is shut down; a fresh boot clears it (2026-11-10).
SESSION_LOST = 'Timed out creating the simulator remote automation session'


@dataclass
class Attempt:
    status: str
    message: str
    timeouts: int = 0
    duration: float = 0.0

    @property
    def session_lost(self):
        return SESSION_LOST in self.message

    @property
    def stalled(self):
        return stalled(self.timeouts) or self.session_lost

    @property
    def stall_reason(self):
        return 'lost the AXe automation session' if self.session_lost else f'{self.timeouts} command timeouts'

    @property
    def reboot_reason(self):
        return self.stall_reason if self.stalled else 'failed'


@dataclass
class Outcome:
    job: object
    device: str
    status: str
    message: str
    duration: float
    stalled_devices: list[str] = field(default_factory=list)
    retried_on: str | None = None
    first: Attempt | None = None
    first_device: str | None = None


@dataclass
class Ticket:
    job: object
    failed_on: str | None = None
    first: Attempt | None = None


class Scheduler:
    def __init__(self, jobs, names):
        self.pending = deque(Ticket(job) for job in jobs)
        self.retries = deque()
        self.live = set(names)
        self.busy = set()
        self.cond = threading.Condition()

    def take(self, name, halt):
        with self.cond:
            while not halt.is_set():
                ticket = self._pick(name)
                if ticket:
                    self.busy.add(name)
                    return ticket
                if not self.pending and not self.retries and not self.busy - {name}:
                    return None
                self.cond.wait(0.2)
            return None

    def _pick(self, name):
        for ticket in self.retries:
            # The device that failed takes its own retry only when no other Simulator is left to run it.
            if ticket.failed_on != name or not self.live - {name}:
                self.retries.remove(ticket)
                return ticket
        return self.pending.popleft() if self.pending else None

    def retry(self, ticket, name, attempt):
        with self.cond:
            ticket.failed_on, ticket.first = name, attempt
            self.retries.append(ticket)
            self.cond.notify_all()

    def unretried(self):
        with self.cond:
            tickets, self.retries = list(self.retries), deque()
            return [abandon(ticket) for ticket in tickets]

    def done(self, name):
        with self.cond:
            self.busy.discard(name)
            self.cond.notify_all()

    def leave(self, name):
        with self.cond:
            self.live.discard(name)
            self.busy.discard(name)
            self.cond.notify_all()


def abandon(ticket):
    first, name = ticket.first, ticket.failed_on
    return Outcome(ticket.job, name, 'fail', f'{first.message}; not retried, the run stopped', first.duration,
                   stalled_devices=[name] if first.stalled else [], first=first, first_device=name)


def settle(ticket, name, attempt):
    stall = attempt.stalled
    if ticket.failed_on is None:
        return Outcome(ticket.job, name, attempt.status, attempt.message, attempt.duration,
                       stalled_devices=[name] if stall else [])
    first, failed_on = ticket.first, ticket.failed_on
    duration = round(first.duration + attempt.duration, 1)
    if attempt.status == 'pass':
        status, message = FLAKY, f'{attempt.message} {RETRIED.format(device=failed_on)}: {first.message}'
    else:
        status, message = 'fail', f'failed on {failed_on} ({first.message}) and again on {name}: {attempt.message}'
    stalled_devices = [d for d, a in ((failed_on, first), (name, attempt)) if a.stalled]
    return Outcome(ticket.job, name, status, message, duration, stalled_devices=stalled_devices, retried_on=name,
                   first=first, first_device=failed_on)


def work(scheduler, device, attempt, heal, report, halt):
    name = device[0]
    try:
        while True:
            ticket = scheduler.take(name, halt)
            if ticket is None:
                return
            try:
                result = attempt(device, ticket.job, ticket.first is not None)
                report.attempted(name, ticket.job, result)
                # Inputs stop arriving on a Simulator 8-40 min after its boot, ahead of a lost session, and 13 of 14
                # such failures passed on a fresh boot (2026-11-13), so any failure reboots, not only a stall.
                reboot = result.status != 'pass' or result.stalled
                retrying = reboot and result.status != 'pass' and ticket.first is None
                if reboot:
                    report.rebooting(name, ticket.job, result, retrying)
                if retrying:
                    scheduler.retry(ticket, name, result)
                else:
                    report.finished(settle(ticket, name, result))
                if reboot and not halt.is_set():
                    heal(device)
            finally:
                scheduler.done(name)
    finally:
        scheduler.leave(name)


def summarize(timings, reboots, stopped):
    failures = sum(status not in ('pass', FLAKY) for _, status, _, _, _ in timings)
    flaky = [f'{locale} {appearance} {case}' for _, status, locale, appearance, case in timings if status == FLAKY]
    lines = []
    if reboots:
        lines.append('rebooted Simulators (shut down and booted after a failed or stalled run; a failed run retried once):')
        lines += [f'  {reboot}' for reboot in reboots]
    if flaky:
        lines.append(f'flaky: {len(flaky)} runs failed first and passed only on the retry; '
                     f'the first run is kept in {FIRST_ATTEMPT}/:')
        lines += [f'  {run}' for run in flaky]
    if stopped:
        lines.append(f'stopped: 3 consecutive {stopped} timeouts on one Simulator — environment or screen problem')
        failures += 1
    return failures, lines
