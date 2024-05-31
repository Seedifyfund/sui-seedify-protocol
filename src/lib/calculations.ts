export const convertToMilliseconds = (value: number, unit: string): number => {
    switch (unit) {
      case 'minutes':
        return value * 60 * 1000;
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value;
    }
  };
  
  export const convertTo24HourFormat = (hour: number, period: string): number => {
    if (period === 'PM' && hour < 12) {
        return hour + 12;
    }
    if (period === 'AM' && hour === 12) {
        return 0;
    }
  
  return hour;
  };
  
  