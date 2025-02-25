export function stringifyJSON(jsonObject: any): string {
  return JSON.stringify(jsonObject, null, 2);
}

export function convertToLocalTime(utcTime: string, utcOffsetMinutes?: number) {
    if (!utcOffsetMinutes) return utcTime;
    const date = new Date(utcTime);
    // When converting from UTC to local, add the offset (effectively subtracting it)
    // For example: if you're in PST (UTC-8):
    // UTC: 10:00 PM UTC
    // UTC offset: -480 minutes
    // To get local: 10:00 PM + (-480 minutes) = 2:00 PM PST
    const localDate = new Date(date.getTime() + (utcOffsetMinutes * 60 * 1000));
    return localDate.toISOString();
}

export function filterJSON(jsonObject: any): any {
  if (Array.isArray(jsonObject)) {
    return jsonObject.map(item => filterJSON(item));
  }
  if (typeof jsonObject === 'object' && jsonObject !== null) {
    return Object.fromEntries(
      Object.entries(jsonObject).filter(([_, value]) => 
        value !== undefined && 
        value !== null && 
        value !== '' && 
        (!Array.isArray(value) || value.length > 0)
      ).map(([key, value]) => [key, filterJSON(value)])
    );
  }
  return jsonObject;
}