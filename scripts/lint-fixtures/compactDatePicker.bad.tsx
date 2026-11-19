import { DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';

const day = new Date(0);
const noop = () => {};

export const Plain = () => <DatePicker selection={day} onDateChange={noop} />;

export const Compact = () => (
  <DatePicker selection={day} onDateChange={noop} modifiers={[datePickerStyle('compact')]} />
);
