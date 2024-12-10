import { Bench } from "tinybench";
import { ConnectionsStorage } from "../src/storage";

const fixedDate = new Date("2025-01-01");
const date0 = new Date("2025-01-09");
const date1 = new Date("2025-01-10");
const date2 = new Date("2025-01-15");
const storage = new ConnectionsStorage(fixedDate);

const generateRandomString = (): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

for (let i = 0; i < 1000; i++) {
  storage.addAirport(generateRandomString());
}
storage.addAirport("AAA");
storage.addAirport("BBB");
storage.addAirport("CCC");
storage.addAirport("DDD");

let defaultDate = new Date(fixedDate);
let connection = {
  originAirportCode: "",
  destinationAirportCode: "",
  date: "",
  stops: 0,
  arriveNextDay: 0,
};
for (let i = 0; i < 10_000_000; i++) {
  defaultDate = new Date(fixedDate);
  const addDays = Math.floor(Math.random() * 320);
  defaultDate.setDate(defaultDate.getDate() + addDays);

  const originAirportIndex = Math.floor(Math.random() * storage.airports.size);
  const destinationAirportIndex = Math.floor(
    Math.random() * storage.airports.size
  );

  connection.originAirportCode = storage.airportsArray[originAirportIndex];
  connection.destinationAirportCode =
    storage.airportsArray[destinationAirportIndex];
  connection.date = defaultDate.toString();
  connection.stops = Math.floor(Math.random() * 2);

  storage.setConnection(connection);
}

storage.setConnection({
  originAirportCode: "AAA",
  destinationAirportCode: "CCC",
  date: date0.toString(),
  stops: 2,
  arriveNextDay: 0,
});

storage.setConnection({
  originAirportCode: "AAA",
  destinationAirportCode: "DDD",
  date: date1.toString(),
  stops: 0,
  arriveNextDay: 0,
});

storage.setConnection({
  originAirportCode: "BBB",
  destinationAirportCode: "CCC",
  date: date1.toString(),
  stops: 1,
  arriveNextDay: 0,
});

storage.setConnection({
  originAirportCode: "CCC",
  destinationAirportCode: "AAA",
  date: date2.toString(),
  stops: 0,
  arriveNextDay: 0,
});

storage.setConnection({
  originAirportCode: "DDD",
  destinationAirportCode: "AAA",
  date: date2.toString(),
  stops: 0,
  arriveNextDay: 0,
});

storage.setConnection({
  originAirportCode: "CCC",
  destinationAirportCode: "BBB",
  date: date2.toString(),
  stops: 0,
  arriveNextDay: 0,
});

const bench = new Bench({ iterations: 10, warmup: true });

bench.add("Bit encoded destination recommendation storage", () => {
  storage.getDestinationsForDatePair(
    [
      { code: "AAA", count: 1 },
      { code: "BBB", count: 1 },
      { code: "DDD", count: 1 },
      { code: "EEE", count: 1 },
      { code: "FFF", count: 1 },
      { code: "GGG", count: 1 },
      { code: "MMM", count: 1 },
    ],
    date1,
    date2,
    0,
    0
  );
});

await bench.run();

console.table(bench.table());
