export interface Destination {
  code: string;
  availableOrigins: number;
  totalStops: number;
  unavailableOutboundOrigins: string[];
  outboundShoulderNights: number;
  unavailableInboundOrigins: string[];
  inboundShoulderNights: number;
}

export interface OriginInput {
  code: string;
  count: number;
}

export interface FlightStats {
  direct: number;
  oneStop: number;
  twoStop: number;
  shoulderNights: number;
  date: Date;
}

export interface InitStorageBody {
  startDate: string;
}

export interface AddConnectionBody {
  connections: Connection[];
}

export interface GetRecommendationsBody {
  origins: OriginInput[];
  meetingStart: string;
  meetingEnd: string;
  maxOutboundShoulderNights?: number;
  maxInboundShoulderNights?: number;
  take?: number;
  destination?: string;
}

export interface Connection {
  originAirportCode: string;
  destinationAirportCode: string;
  date: string;
  stops: number;
  arriveNextDay: number;
}

export interface IStorage {
  addAirport(airportCode: string): boolean;

  setConnection(connection: Connection): void;

  getDestinationsForDatePair(
    origins: OriginInput[],
    meetingStart: Date,
    meetingEnd: Date,
    maxOutboundShoulderNights: number,
    maxInboundShoulderNights: number
  ): Destination[];
}
