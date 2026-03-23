export const formatDistance = (distanceKm: number) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
};

export const formatTime = (value: Date) => {
  return value.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
