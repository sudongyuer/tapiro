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
# OCR may read the colon as a full stop.
DAY_PERIODS = {
    'zh-Hans': ('凌晨|早上|上午', '中午|下午|晚上'),
    'en': ('AM', 'PM'),
    'ms': ('PG', 'TGH|PTG|MLM'),
}


def twelve_hour_run():
    return TWELVE_HOURS in os.environ.get('TAPIRO_VERIFY_ARGS', '').split()


def _twelve(hours, minutes, locale, period):
    if locale == 'zh-Hans':
        return rf'(?:{period}){hours}[:.]{minutes}'
    return rf'{hours}[:.]{minutes}\s?(?:{period})'


def clock(locale=None):
    if not twelve_hour_run():
        return r'\d{2}[:.]\d{2}'
    morning, afternoon = DAY_PERIODS[locale or sys.argv[4]]
    return _twelve(r'\d{1,2}', r'\d{2}', locale or sys.argv[4], f'{morning}|{afternoon}')


def clock_at(hour, minute, locale=None):
    if not twelve_hour_run():
        return f'{hour:02d}[:.]{minute:02d}'
    morning, afternoon = DAY_PERIODS[locale or sys.argv[4]]
    return _twelve(hour % 12 or 12, f'{minute:02d}', locale or sys.argv[4], morning if hour < 12 else afternoon)
