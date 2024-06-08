import moment from "moment-timezone";

export const getDateString = (date?: string) => {
  if (!date) {
    return "in nächster Zeit";
  }

  const now = moment();
  const dateMoment = moment(date);

  if (now.isSame(dateMoment, "day")) {
    return "heute";
  }

  if (now.clone().add(1, "days").isSame(dateMoment, "day")) {
    return "morgen";
  }

  return `am ${dateMoment.format("DD.MM.YYYY")}`;
};
