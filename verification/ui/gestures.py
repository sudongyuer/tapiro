# On the iOS 27.2 Simulator `axe swipe` scrolls but never starts a pull to refresh; explicit touch moves do.
def pull(ui, items):
    width, height = items[0]['frame']['width'], items[0]['frame']['height']
    ui.axe('drag', '--start-x', str(round(width / 2)), '--start-y', str(round(height * 0.34)), '--end-x',
           str(round(width / 2)), '--end-y', str(round(height * 0.86)), '--duration', '1.2', '--steps', '80')


# For scrolls that must stop near a target on iOS 27.2; measurements in the README.
def drag(ui, start, end, duration=1.0, steps=40):
    ui.axe('drag', '--start-x', str(round(start[0])), '--start-y', str(round(start[1])), '--end-x', str(round(end[0])),
           '--end-y', str(round(end[1])), '--duration', str(duration), '--steps', str(steps))
