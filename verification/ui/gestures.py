# On the iOS 27.2 Simulator `axe swipe` scrolls but never starts a pull to refresh; explicit touch moves do.
def pull(ui, items):
    width, height = items[0]['frame']['width'], items[0]['frame']['height']
    ui.axe('drag', '--start-x', str(round(width / 2)), '--start-y', str(round(height * 0.34)), '--end-x',
           str(round(width / 2)), '--end-y', str(round(height * 0.86)), '--duration', '1.2', '--steps', '80')
