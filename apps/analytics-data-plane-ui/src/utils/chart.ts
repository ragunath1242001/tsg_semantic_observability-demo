import {
  _adapters,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  TimeUnit,
  Title,
  Tooltip
} from "chart.js";
import dayjs, { QUnitType } from "dayjs";
import AdvancedFormat from "dayjs/plugin/advancedFormat.js";
import CustomParseFormat from "dayjs/plugin/customParseFormat.js";
import isoWeek from "dayjs/plugin/isoWeek.js";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import QuarterOfYear from "dayjs/plugin/quarterOfYear.js";

function dayjsAdapter() {
  dayjs.extend(AdvancedFormat);
  dayjs.extend(QuarterOfYear);
  dayjs.extend(LocalizedFormat);
  dayjs.extend(CustomParseFormat);
  dayjs.extend(isoWeek);

  const FORMATS = {
    datetime: "MMM D, YYYY, H:mm:ss",
    millisecond: "mm:ss.SSS",
    second: "H:mm:ss",
    minute: "H:mm",
    hour: "H:mm",
    day: "MMM D",
    week: "ll",
    month: "MMM YYYY",
    quarter: "[Q]Q - YYYY",
    year: "YYYY"
  };

  _adapters._date.override({
    formats: () => FORMATS,
    parse: function (value: any, format?: TimeUnit) {
      const valueType = typeof value;

      if (value === null || valueType === "undefined") {
        return null;
      }

      if (valueType === "string" && typeof format === "string") {
        return dayjs(value, format).isValid()
          ? dayjs(value, format).valueOf()
          : null;
      } else if (!(value instanceof dayjs)) {
        return dayjs(value).isValid() ? dayjs(value).valueOf() : null;
      }
      return null;
    },
    format: function (time: any, format: TimeUnit): string {
      return dayjs(time).format(format);
    },
    add: function (time: any, amount: number, unit: QUnitType & TimeUnit) {
      return dayjs(time).add(amount, unit).valueOf();
    },
    diff: function (max: any, min: any, unit: TimeUnit) {
      return dayjs(max).diff(dayjs(min), unit);
    },
    startOf: function (
      time: any,
      unit: (TimeUnit & QUnitType) | "isoWeek",
      weekday?: number
    ) {
      if (unit === "isoWeek") {
        // Ensure that weekday has a valid format
        //const formattedWeekday

        const validatedWeekday: number =
          typeof weekday === "number" && weekday > 0 && weekday < 7
            ? weekday
            : 1;

        return dayjs(time)
          .isoWeekday(validatedWeekday)
          .startOf("day")
          .valueOf();
      }

      return dayjs(time).startOf(unit).valueOf();
    },
    endOf: function (time: any, unit: TimeUnit & QUnitType) {
      return dayjs(time).endOf(unit).valueOf();
    }
  });
}

export function registerChartJs() {
  dayjsAdapter();
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Title,
    Tooltip,
    Legend
  );
}
