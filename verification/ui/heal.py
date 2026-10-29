from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass, field

from breaker import stalled

RETRIED = '(retried after a stalled device)'


@dataclass
class Attempt:
    status: str
    message: str
    timeouts: int = 0
    duration: float = 0.0
    log: str = ''


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

    @property
    def stalled_device(self):
        return self.stalled_devices[0] if self.stalled_devices else None


@dataclass
class Ticket:
    job: object
    stalled_on: str | None = None
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
            # The stalled device takes its own retry only when no other Simulator is left to run it.
            if ticket.stalled_on != name or not self.live - {name}:
                self.retries.remove(ticket)
                return ticket
        return self.pending.popleft() if self.pending else None

    def retry(self, ticket, name, attempt):
        with self.cond:
            ticket.stalled_on, ticket.first = name, attempt
            self.retries.append(ticket)
            self.cond.notify_all()

    def done(self, name):
        with self.cond:
            self.busy.discard(name)
            self.cond.notify_all()

    def leave(self, name):
        with self.cond:
            self.live.discard(name)
            self.busy.discard(name)
            self.cond.notify_all()


def settle(ticket, name, attempt):
    stall = stalled(attempt.timeouts)
    if ticket.stalled_on is None:
        return Outcome(ticket.job, name, attempt.status, attempt.message, attempt.duration,
                       stalled_devices=[name] if stall else [])
    first = ticket.stalled_on
    duration = round(ticket.first.duration + attempt.duration, 1)
    if stall:
        status, message = 'fail', f'stalled on {first} and again on {name}: {attempt.message}'
    elif attempt.status == 'pass':
        status, message = 'pass', f'{attempt.message} {RETRIED}'.strip()
    else:
        status, message = 'fail', f'{attempt.message}; retried after {first} stalled'
    return Outcome(ticket.job, name, status, message, duration,
                   stalled_devices=[first, name] if stall else [first], retried_on=name, first=ticket.first)


def work(scheduler, device, attempt, heal, report, halt):
    name = device[0]
    try:
        while True:
            ticket = scheduler.take(name, halt)
            if ticket is None:
                return
            try:
                result = attempt(device, ticket.job)
                report.attempted(name, ticket.job, result)
                if not stalled(result.timeouts):
                    report.finished(settle(ticket, name, result))
                    continue
                retrying = ticket.stalled_on is None and result.status != 'pass'
                report.stalled(name, ticket.job, result, retrying)
                if retrying:
                    scheduler.retry(ticket, name, result)
                else:
                    report.finished(settle(ticket, name, result))
                heal(device)
            finally:
                scheduler.done(name)
    finally:
        scheduler.leave(name)
