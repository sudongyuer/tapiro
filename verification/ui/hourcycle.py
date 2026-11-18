TWELVE_HOURS = '-AppleICUForce12HourTime'


def hour_cycle_commands(udid, args):
    # The Malaysian regions default to 12-hour time; a case gets 24 hours unless its ARGS name TWELVE_HOURS. A launch
    # argument reaches UIDatePicker but not Locale.current.hourCycle, so the setting goes where Settings writes it.
    twelve = TWELVE_HOURS in args
    spawn = ['xcrun', 'simctl', 'spawn', udid, 'defaults', 'write', '-g']
    return [[*spawn, 'AppleICUForce24HourTime', '-bool', 'false' if twelve else 'true'],
            [*spawn, 'AppleICUForce12HourTime', '-bool', 'true' if twelve else 'false']]
