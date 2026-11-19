#!/usr/bin/env bash
set -u

DIR="${TAPIRO_SIM_LOCK_DIR:-$HOME/.cache/tapiro/sim-lock}"
POLL="${TAPIRO_SIM_LOCK_POLL:-3}"
MAX_AGE="${TAPIRO_SIM_LOCK_MAX_AGE:-14400}"
OWNERLESS_GRACE=10
HELD="$DIR/held"
QUEUE="$DIR/queue"
LOG="$DIR/log"

usage() {
  cat >&2 <<'EOF'
usage: sim-lock.sh acquire <name> [--timeout <s>] [--pid <pid>] [--max-age <s>]
       sim-lock.sh release <name>
       sim-lock.sh status
       sim-lock.sh run <name> [--timeout <s>] [--max-age <s>] -- <command...>
EOF
  exit 64
}

now() { date +%s; }
alive() { [ -n "$1" ] && ps -p "$1" >/dev/null 2>&1; }
field() { sed -n "s/^$2=//p" "$1" 2>/dev/null | head -n 1; }

note() {
  local line
  line="$(date '+%Y-%m-%dT%H:%M:%S%z') $*"
  echo "sim-lock: $*" >&2
  echo "$line" >>"$LOG" 2>/dev/null
}

init() { mkdir -p "$QUEUE" || exit 70; }

next_number() {
  local lock="$DIR/seq.lock" tries=0 n
  until mkdir "$lock" 2>/dev/null; do
    if ! alive "$(cat "$lock/pid" 2>/dev/null)"; then
      tries=$((tries + 1))
      if [ "$tries" -ge 20 ]; then
        rm -rf "$lock"
        tries=0
      fi
    fi
    sleep 0.05
  done
  echo $$ >"$lock/pid"
  n=$(($(cat "$DIR/seq" 2>/dev/null || echo 0) + 1))
  echo "$n" >"$DIR/seq.tmp.$$" && mv "$DIR/seq.tmp.$$" "$DIR/seq"
  rm -rf "$lock"
  echo "$n"
}

TICKET=""

join_queue() {
  local name="$1" n tmp
  n=$(next_number)
  tmp="$DIR/ticket.tmp.$$"
  printf 'name=%s\npid=%s\njoined=%s\n' "$name" "$$" "$(now)" >"$tmp"
  TICKET="$QUEUE/$(printf '%012d' "$n")"
  mv "$tmp" "$TICKET"
}

leave_queue() {
  [ -n "$TICKET" ] && rm -f "$TICKET"
  TICKET=""
}

prune_dead_tickets() {
  local t pid who
  for t in "$QUEUE"/*; do
    [ -f "$t" ] || continue
    pid=$(field "$t" pid)
    if [ -n "$pid" ] && ! alive "$pid"; then
      who=$(field "$t" name)
      rm -f "$t" && note "dropped ticket $(basename "$t") of $who (pid $pid gone)"
    fi
  done
}

first_ticket() {
  local t
  for t in "$QUEUE"/*; do
    [ -f "$t" ] && { echo "$t"; return; }
  done
}

OWNERLESS_SINCE=""

holder_stale_reason() {
  local owner="$HELD/owner" pid since age limit
  if [ ! -f "$owner" ]; then
    [ -n "$OWNERLESS_SINCE" ] || OWNERLESS_SINCE=$(now)
    if [ $(($(now) - OWNERLESS_SINCE)) -ge "$OWNERLESS_GRACE" ]; then
      echo "lock has no owner record"
    fi
    return
  fi
  OWNERLESS_SINCE=""
  pid=$(field "$owner" pid)
  since=$(field "$owner" since)
  limit=$(field "$owner" max_age)
  if ! alive "$pid"; then
    echo "holder $(field "$owner" name) pid $pid is gone"
    return
  fi
  age=$(($(now) - ${since:-0}))
  limit=${limit:-$MAX_AGE}
  if [ "$age" -gt "$limit" ]; then
    echo "holder $(field "$owner" name) held it ${age}s, over the max age of ${limit}s"
  fi
}

take_lock() {
  local name="$1" pid="$2"
  mkdir "$HELD" 2>/dev/null || return 1
  printf 'name=%s\npid=%s\nsince=%s\nmax_age=%s\n' "$name" "$pid" "$(now)" "$MAX_AGE" >"$HELD/owner.tmp"
  mv "$HELD/owner.tmp" "$HELD/owner"
}

acquire() {
  local name="$1" pid="$2" timeout="$3" start reason head
  init
  start=$(now)
  join_queue "$name"
  trap 'leave_queue; exit 130' INT TERM HUP
  while :; do
    prune_dead_tickets
    if [ ! -f "$TICKET" ]; then
      join_queue "$name"
      note "$name rejoined the queue: its ticket was removed by another process"
    fi
    head=$(first_ticket)
    if [ "$head" = "$TICKET" ]; then
      if [ -d "$HELD" ]; then
        reason=$(holder_stale_reason)
        if [ -n "$reason" ]; then
          rm -rf "$HELD"
          note "$name took over: $reason"
        fi
      fi
      if take_lock "$name" "$pid"; then
        leave_queue
        trap - INT TERM HUP
        note "$name acquired (pid $pid)"
        return 0
      fi
    fi
    if [ -n "$timeout" ] && [ $(($(now) - start)) -ge "$timeout" ]; then
      leave_queue
      trap - INT TERM HUP
      note "$name gave up after ${timeout}s"
      return 75
    fi
    sleep "$POLL"
  done
}

release() {
  local name="$1" pid="${2:-}" holder
  init
  holder=$(field "$HELD/owner" name)
  if [ ! -d "$HELD" ]; then
    echo "sim-lock: not held" >&2
    return 1
  fi
  if [ "$holder" != "$name" ]; then
    echo "sim-lock: refused, held by ${holder:-unknown}, not $name" >&2
    return 1
  fi
  if [ -n "$pid" ] && [ "$(field "$HELD/owner" pid)" != "$pid" ]; then
    echo "sim-lock: refused, $name is held by pid $(field "$HELD/owner" pid), not $pid" >&2
    return 1
  fi
  rm -rf "$HELD"
  note "$name released"
}

status() {
  local t pid state limit
  init
  if [ -f "$HELD/owner" ]; then
    pid=$(field "$HELD/owner" pid)
    alive "$pid" && state=alive || state=gone
    limit=$(field "$HELD/owner" max_age)
    echo "held by $(field "$HELD/owner" name) (pid $pid, $state) for $(($(now) - $(field "$HELD/owner" since)))s, max age ${limit:-$MAX_AGE}s"
  elif [ -d "$HELD" ]; then
    echo "held (owner record not written yet)"
  else
    echo "free"
  fi
  echo "queue:"
  for t in "$QUEUE"/*; do
    [ -f "$t" ] || continue
    pid=$(field "$t" pid)
    alive "$pid" && state=alive || state=gone
    echo "  $(basename "$t") $(field "$t" name) (pid $pid, $state, waiting $(($(now) - $(field "$t" joined)))s)"
  done
}

run_locked() {
  local name="$1" timeout="$2" rc
  shift 2
  acquire "$name" "$$" "$timeout" || exit $?
  trap 'release "$name" "$$" >/dev/null 2>&1' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  trap 'exit 129' HUP
  "$@"
  rc=$?
  exit "$rc"
}

[ $# -ge 1 ] || usage
cmd="$1"
shift

case "$cmd" in
  acquire | run)
    [ $# -ge 1 ] || usage
    name="$1"
    shift
    timeout=""
    pid="$PPID"
    while [ $# -gt 0 ]; do
      case "$1" in
        --timeout) timeout="${2:?}"; shift 2 ;;
        --pid) pid="${2:?}"; shift 2 ;;
        --max-age) MAX_AGE="${2:?}"; shift 2 ;;
        --) shift; break ;;
        *) usage ;;
      esac
    done
    if [ "$cmd" = acquire ]; then
      acquire "$name" "$pid" "$timeout"
      exit $?
    fi
    [ $# -ge 1 ] || usage
    run_locked "$name" "$timeout" "$@"
    ;;
  release)
    [ $# -eq 1 ] || usage
    release "$1"
    ;;
  status)
    status
    ;;
  *) usage ;;
esac
