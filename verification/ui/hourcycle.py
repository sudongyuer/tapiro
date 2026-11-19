import os
import sys

TWELVE_HOURS = '-AppleICUForce12HourTime'


def hour_cycle_commands(udid, args):
    # The Malaysian regions default to 12-hour time; a case gets 24 hours unless its ARGS name TWELVE_HOURS. A launch
    # argument reaches UIDatePicker but not Locale.current.hourCycle, so the setting goes where Settings writes it.
    twelve = TWELVE_HOURS in args
    spawn = ['xcrun', 'simctl', 'spawn', udid, 'defaults', 'write', '-g']
    return [[*spawn, 'AppleICUForce24HourTime', '-bool', 'false' if twelve else 'true'],
            [*spawn, 'AppleICUForce12HourTime', '-bool', 'true' if twelve else 'false']]


def with_hour_cycle(args, hours):
    if hours == 12 and TWELVE_HOURS not in args:
        return [*args, TWELVE_HOURS, 'YES']
    return list(args)


# A case reads the clock as the device writes it: 24-hour unless the run is 12-hour (`--hour-cycle 12` or ARGS).
TWELVE_HOUR_CLOCKS = {
    'zh-Hans': r'(?:凌晨|早上|上午|中午|下午|晚上)\d{1,2}:\d{2}',
    'en': r'\d{1,2}:\d{2}\s?[AP]M',
    'ms': r'\d{1,2}:\d{2}\s?(?:PG|TGH|PTG|MLM)',
}


def clock(locale=None):
    if TWELVE_HOURS not in os.environ.get('TAPIRO_VERIFY_ARGS', '').split():
        return r'\d{2}:\d{2}'
    return TWELVE_HOUR_CLOCKS[locale or sys.argv[4]]
