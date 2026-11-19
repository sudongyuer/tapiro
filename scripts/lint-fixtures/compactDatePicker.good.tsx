import { DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';

const day = new Date(0);
const noop = () => {};

export const Wheel = () => (
  <DatePicker
    selection={day}
    onDateChange={noop}
    modifiers={[datePickerStyle('wheel'), labelsHidden()]}
  />
);

export const Graphical = () => (
  <DatePicker selection={day} onDateChange={noop} modifiers={[datePickerStyle('graphical')]} />
);
