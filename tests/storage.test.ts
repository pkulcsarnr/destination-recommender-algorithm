import { expect, describe, it } from "bun:test";
import { ConnectionsStorage } from "../src/storage";

describe("Bit encoded destination recommendation storage", () => {
  const fixedDate = new Date("2025-01-01");
  const date0 = new Date("2025-01-09");
  const date1 = new Date("2025-01-10");
  const date2 = new Date("2025-01-15");
  const date3 = new Date("2025-01-16");
  const storage = new ConnectionsStorage(fixedDate);

  const connection1 = {
    originAirportCode: "AAA",
    destinationAirportCode: "CCC",
    date: date0.toString(),
    stops: 2,
    arriveNextDay: 0,
  };
  const connection2 = {
    originAirportCode: "AAA",
    destinationAirportCode: "DDD",
    date: date1.toString(),
    stops: 0,
    arriveNextDay: 0,
  };
  const connection3 = {
    originAirportCode: "BBB",
    destinationAirportCode: "CCC",
    date: date1.toString(),
    stops: 1,
    arriveNextDay: 0,
  };
  const connection4 = {
    originAirportCode: "CCC",
    destinationAirportCode: "AAA",
    date: date2.toString(),
    stops: 1,
    arriveNextDay: 0,
  };
  const connection5 = {
    originAirportCode: "DDD",
    destinationAirportCode: "AAA",
    date: date2.toString(),
    stops: 0,
    arriveNextDay: 0,
  };
  const connection6 = {
    originAirportCode: "CCC",
    destinationAirportCode: "BBB",
    date: date3.toString(),
    stops: 0,
    arriveNextDay: 0,
  };

  storage.setConnection(connection1);
  storage.setConnection(connection2);
  storage.setConnection(connection3);
  storage.setConnection(connection4);
  storage.setConnection(connection5);
  storage.setConnection(connection6);

  it("Returns data correctly for AAA,BBB,CCC", () => {
    const totalCounts = [
      {
        code: "CCC",
        availableOrigins: 4,
        totalStops: 4,
        unavailableOutboundOrigins: [],
        unavailableInboundOrigins: [],
        outboundShoulderNights: 2,
        inboundShoulderNights: 1,
      },
      {
        code: "DDD",
        availableOrigins: 2,
        totalStops: 0,
        unavailableOutboundOrigins: ["CCC", "BBB"],
        unavailableInboundOrigins: ["CCC", "BBB"],
        outboundShoulderNights: 0,
        inboundShoulderNights: 0,
      },
      {
        code: "AAA",
        availableOrigins: 0,
        totalStops: 0,
        unavailableOutboundOrigins: ["CCC", "BBB"],
        unavailableInboundOrigins: ["CCC", "BBB"],
        outboundShoulderNights: 0,
        inboundShoulderNights: 0,
      },
      {
        code: "BBB",
        availableOrigins: 0,
        totalStops: 0,
        unavailableOutboundOrigins: ["AAA", "CCC"],
        unavailableInboundOrigins: ["AAA", "CCC"],
        outboundShoulderNights: 0,
        inboundShoulderNights: 0,
      },
    ];

    const result = storage.getDestinationsForDatePair(
      [
        { code: "AAA", count: 2 },
        { code: "BBB", count: 1 },
        { code: "CCC", count: 1 },
      ],
      date1,
      date2,
      1,
      1
    );

    expect(result).toEqual(totalCounts);
  });
});
