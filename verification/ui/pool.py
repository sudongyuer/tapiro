DEVICE_NAME = 'Tapiro Verify'
DEFAULT_WORKERS = 3
MIN_FREE_GB = 15


def device_names(count):
    return [DEVICE_NAME if index == 0 else f'{DEVICE_NAME} {index + 1}' for index in range(count)]


def worker_count(requested, runs, free_bytes, pinned_udid=False):
    if pinned_udid or requested <= 1 or runs <= 1:
        return 1, None
    free_gb = free_bytes / 1e9
    if free_gb < MIN_FREE_GB:
        return 1, f'{free_gb:.1f} GB free, below {MIN_FREE_GB} GB: running on one Simulator'
    return min(requested, runs), None
