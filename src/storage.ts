import BitSet from "bitset";
import type {
  Destination,
  OriginInput,
  IStorage,
  Connection,
} from "./interfaces";

/**
 * A multi-dimensional bit storage for flight connections with the aim
 * to provide destination recommendations for many to many travels
 */
export class ConnectionsStorage implements IStorage {
  /**
   * Number of maximum stops of a connection.
   *
   * This value sets the first dimension of the storage
   * */
  MAX_STOPS_SUPPORTED = 2;

  /**
   * Number of days supported to the future. The storage must be initialized
   * with an initial day and a maximum future day to allow index based
   * direct access to the data.
   *
   * This value sets the second dimension of the storage
   */
  MAX_DAYS_SUPPORTED = 360;

  // second layer is for days => 360 days into the future,
  // third layer is for destinations,
  // first layer is for stops => 0 - zero, 1 - one, 2 - two stops,
  // fourth layer is for origins

  /**
   * Multi-dimensional bit storage for outbound connections. The outbound storage stored
   * connetions based on their arrival date and time.
   *
   * The first dimension is for the date. Second dimension is for the stops.
   * Third dimension is for the origin airport. The last dimension is the bit array
   * for the destination airport.
   */
  outboundStorage: BitSet[][][] = [];

  /**
   * Multi-dimensional bit storage for outbound connections. The outbound storage stored
   * connetions based on their departure date and time.
   *
   * The first dimension is for the date. Second dimension is for the stops.
   * Third dimension is for the origin airport. The last dimension is the bit array
   * for the destination airport.
   */
  inboundStorage: BitSet[][][] = [];

  /**
   * Map of airports for faster access of airport code index for outbound and inbound
   * storage array accesses.
   */
  airports: Map<string, number> = new Map();

  /**
   * Array representation of the airports map. This helps
   */
  airportsArray: string[] = [];

  /**
   * The initialization date of the storage. This is the first element of the storage,
   * and from this value are then calculated the indexes from any future date.
   */
  startDate: Date;

  constructor(initDate: Date) {
    this.startDate = initDate;

    for (let i = 0; i < this.MAX_DAYS_SUPPORTED; i++) {
      this.outboundStorage.push([]);
      this.inboundStorage.push([]);
    }
  }

  /**
   * Method to add an airport code to the storage. If the airport code is new,
   * the method allcoates additional space in the storage.
   * @param airportCode airport code to add to the storage
   * @returns false if the airport is already present in the storage, true otherwise.
   */
  addAirport(airportCode: string): boolean {
    if (this.airports.has(airportCode)) return false;

    this.airports.set(airportCode, this.airports.size);
    this.airportsArray.push(airportCode);

    for (let i = 0; i < this.MAX_DAYS_SUPPORTED; i++) {
      this.outboundStorage[i].push([]);
      this.inboundStorage[i].push([]);
      for (let k = 0; k <= this.MAX_STOPS_SUPPORTED; k++) {
        this.outboundStorage[i].at(-1)!.push(new BitSet());
        this.inboundStorage[i].at(-1)!.push(new BitSet());
      }
    }

    return true;
  }

  /**
   * Internal function to checks if the number of stops is supported in this storage.
   * Throws error if the provided stops is out of range
   * @param stops Number of stops
   */
  _validateStops(stops: number): void {
    if (stops < 0 || stops > this.MAX_STOPS_SUPPORTED) {
      throw new Error(
        `Number of stops not supported. Value must be between 0 and ${this.MAX_STOPS_SUPPORTED}`
      );
    }
  }

  /**
   * Internal function to validate the input date. Throws error if the
   * provided date is outside of the range from the initialization date
   * and maximum days from the initialization date.
   * @param index Index derived from the input date and initialization date
   * @param date Input date
   */
  _validateDateIndex(index: number, date: Date): void {
    if (index < 0 || index > this.MAX_DAYS_SUPPORTED) {
      throw new Error(
        `Date is outside of supported range. Supported range is ${this.startDate.toISOString()} and + ${
          this.MAX_DAYS_SUPPORTED
        } days. Received ${date.toISOString()}`
      );
    }
  }

  /**
   * Internal function that converts the input date to date index to access the storage by index.
   * The index is caluclated as day difference from the initial date.
   * @param date Input date to be converted
   * @returns Date index
   */
  _convertDateToArrayIndex(date: Date): number {
    const timeDifference = date.getTime() - this.startDate.getTime();

    const dateIndex = Math.floor(timeDifference / (1000 * 3600 * 24));

    this._validateDateIndex(dateIndex, date);

    return dateIndex;
  }

  /**
   * Function that stores a connection in the storages. If necessary adds the airport.
   * @param param0 Connection. For more details, look at the interface.
   */
  setConnection({
    originAirportCode,
    destinationAirportCode,
    date,
    stops,
    arriveNextDay,
  }: Connection): void {
    this._validateStops(stops);
    this.addAirport(originAirportCode);
    this.addAirport(destinationAirportCode);
    const dateIndex = this._convertDateToArrayIndex(new Date(date));

    const arrivalDateIndex = dateIndex + arriveNextDay;
    this._validateDateIndex(arrivalDateIndex, new Date(date));

    const originIndex = this.airports.get(originAirportCode);
    const destinationIndex = this.airports.get(destinationAirportCode);

    if (originIndex === undefined || destinationIndex === undefined) return;

    this.outboundStorage[arrivalDateIndex][destinationIndex][stops].set(
      originIndex,
      1
    );

    this.inboundStorage[dateIndex][originIndex][stops].set(destinationIndex, 1);
  }

  /**
   * Internal method that converts a list of airport codes to a bit array with
   * ones on the places where the input airport codes are present.
   * @param origins array of airport codes
   * @returns Bit array
   */
  _prepareOriginVector(origins: string[]): BitSet {
    return new BitSet(
      origins
        .map((origin) => this.airports.get(origin))
        .filter((index) => index !== undefined) as number[]
    );
  }

  /**
   * Method that returns the total number of stops for any number of origins to a specific
   * outbound date index and a destination index.
   *
   * The method to calculate efficiently the stops is to remove the ones from the origins array where
   * direct connection exists. We than take this vector and combine with the one stop connections.
   * Calcualting the cardinality of this newly created vector returns the number of one stop connections.
   * Than we take this vector and similarly to previous steps move to calcualte the two stop connections.
   *
   * @param originsVector bit array of the encoded origin airports
   * @param outboundIndex date index to look for
   * @param destinationIndex destination index to look for
   * @returns
   */
  getOutboundStopsCount(
    originsVector: BitSet,
    outboundIndex: number,
    destinationIndex: number
  ): number {
    const outboundDirectNeg = this.outboundStorage[outboundIndex][
      destinationIndex
    ][0]
      .not()
      .and(originsVector);

    const outboundOneStopCounter = this.outboundStorage[outboundIndex][
      destinationIndex
    ][1]
      .and(outboundDirectNeg)
      .cardinality();

    const outboundOneStopNeg =
      this.outboundStorage[outboundIndex][destinationIndex][1].not();

    const outboundTwoStopCounter =
      this.outboundStorage[outboundIndex][destinationIndex][2]
        .and(outboundDirectNeg)
        .and(outboundOneStopNeg)
        .cardinality() * 2;

    return outboundOneStopCounter + outboundTwoStopCounter;
  }

  /**
   * Method that returns the total number of stops for any number of origins to a specific
   * outbound date index and a destination index. For details refer to `getOutboundStopsCount` method.
   *
   * @param originsVector bit array of the encoded origin airports
   * @param outboundIndex date index to look for
   * @param destinationIndex destination index to look for
   * @returns
   */
  getInboundStopsCount(
    originsVector: BitSet,
    inboundIndex: number,
    destinationIndex: number
  ): number {
    const inboundDirectNeg = this.inboundStorage[inboundIndex][
      destinationIndex
    ][0]
      .not()
      .and(originsVector);

    const inboundOneStopCounter = this.inboundStorage[inboundIndex][
      destinationIndex
    ][1]
      .and(inboundDirectNeg)
      .cardinality();

    const inboundOneStopNeg =
      this.inboundStorage[inboundIndex][destinationIndex][1].not();

    const inboundTwoStopCounter =
      this.inboundStorage[inboundIndex][destinationIndex][2]
        .and(inboundDirectNeg)
        .and(inboundOneStopNeg)
        .cardinality() * 2;

    return inboundOneStopCounter + inboundTwoStopCounter;
  }

  /**
   * Method to get an array of airport codes from available connections bit array
   * and the origins vector, where the origins vector is true and there is no
   * available connection.
   *
   * The method ignores one selected index. This is used to skip the same airport code.
   * @param availableConnections Bit array of available connections
   * @param originsVector Bit array of the origins
   * @param currentAirportIndex Index of the airport we are getting the unavailable airports. This index is
   * going to be skipped.
   * @returns Airport codes that have no connection from the origins
   */
  getUnavailableOrigins(
    availableConnections: BitSet,
    originsVector: BitSet,
    currentAirportIndex: number
  ): string[] {
    const result: string[] = [];

    for (const arrayIndex of availableConnections
      .not()
      .and(originsVector)
      .toArray()) {
      if (arrayIndex === currentAirportIndex) continue;

      result.push(this.airportsArray[arrayIndex]);
    }

    return result;
  }

  /**
   * Internal function that sums the input array
   * @param arr array of numbers to sum
   * @returns sum of the array
   */
  sumArray(arr: number[]): number {
    return arr.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0
    );
  }

  /**
   * For a given list of origins (consisting of airport codes and number of travllers) and a
   * set of date pairs (meeting start and meeting end) return the first N destinations with the
   * most available connections.
   *
   * It is possible to allow shoulder nights before and after the date period.
   * @param origins Array of origins
   * @param meetingStart Date of the meeting start
   * @param meetingEnd Date of the meetin end
   * @param maxOutboundShoulderNights Maximum days to check before meeting start
   * @param maxInboundShoulderNights Maximum daays to check after meeting end
   * @param take Number of results to return
   * @returns
   */
  getDestinationsForDatePair(
    origins: OriginInput[],
    meetingStart: Date,
    meetingEnd: Date,
    maxOutboundShoulderNights: number = 0,
    maxInboundShoulderNights: number = 0,
    take: number = 0
  ): Destination[] {
    const result: Destination[] = [];

    const originsMap: Map<string, number> = new Map(
      origins.map(({ code, count }) => [code, count])
    );

    const originsVector = this._prepareOriginVector([...originsMap.keys()]);

    const outboundIndex = this._convertDateToArrayIndex(meetingStart);
    const inboundIndex = this._convertDateToArrayIndex(meetingEnd);

    for (let i = 0; i < this.airports.size; i++) {
      let availableOutboundConnections = this.outboundStorage[outboundIndex][
        i
      ][0]
        .or(this.outboundStorage[outboundIndex][i][1])
        .or(this.outboundStorage[outboundIndex][i][2]);

      let outboundCount = availableOutboundConnections
        .and(originsVector)
        .cardinality();

      let totalOutboundStops = this.getOutboundStopsCount(
        originsVector,
        outboundIndex,
        i
      );
      let outboundShoulderNights = 0;

      // here check if date before has some available option
      if (outboundCount < origins.length && maxOutboundShoulderNights > 0) {
        for (let j = 1; j <= maxOutboundShoulderNights; j++) {
          if (outboundCount < origins.length) {
            const aocSn = this.outboundStorage[outboundIndex - j][i][0]
              .or(this.outboundStorage[outboundIndex - j][i][1])
              .or(this.outboundStorage[outboundIndex - j][i][2]);

            const currentRequiredOrigins = availableOutboundConnections
              .not()
              .and(originsVector);

            totalOutboundStops += this.getOutboundStopsCount(
              currentRequiredOrigins,
              outboundIndex - j,
              i
            );

            const temp = aocSn.and(currentRequiredOrigins);

            const temporaryCardinality = temp.cardinality();
            outboundShoulderNights +=
              this.sumArray(
                temp
                  .toArray()
                  .map((ind) => originsMap.get(this.airportsArray[ind])!)
              ) * j;

            outboundCount += temporaryCardinality;

            availableOutboundConnections =
              availableOutboundConnections.or(aocSn);
          }
        }
      }

      let availableInboundConnections = this.inboundStorage[inboundIndex][i][0]
        .or(this.inboundStorage[inboundIndex][i][1])
        .or(this.inboundStorage[inboundIndex][i][2]);

      let inboundCount = availableInboundConnections
        .and(originsVector)
        .cardinality();

      let totalInboundStops = this.getInboundStopsCount(
        originsVector,
        inboundIndex,
        i
      );
      let inboundShoulderNights = 0;

      // here check if date before has some available option
      if (inboundCount < origins.length) {
        for (let j = 1; j <= maxInboundShoulderNights; j++) {
          if (inboundCount < origins.length && maxInboundShoulderNights > 0) {
            const aocSn = this.inboundStorage[inboundIndex + j][i][0]
              .or(this.inboundStorage[inboundIndex + j][i][1])
              .or(this.inboundStorage[inboundIndex + j][i][2]);

            const currentRequiredOrigins = availableInboundConnections
              .not()
              .and(originsVector);

            totalInboundStops += this.getInboundStopsCount(
              currentRequiredOrigins,
              inboundIndex + j,
              i
            );

            const temp = aocSn.and(currentRequiredOrigins);

            const temporaryCardinality = temp.cardinality();
            inboundShoulderNights +=
              this.sumArray(
                temp
                  .toArray()
                  .map((ind) => originsMap.get(this.airportsArray[ind])!)
              ) * j;

            inboundCount += temporaryCardinality;

            availableInboundConnections = availableInboundConnections.or(aocSn);
          }
        }
      }

      result.push({
        code: this.airportsArray[i],
        availableOrigins: outboundCount + inboundCount,
        totalStops: totalOutboundStops + totalInboundStops,
        unavailableOutboundOrigins: this.getUnavailableOrigins(
          availableOutboundConnections,
          originsVector,
          i
        ),
        unavailableInboundOrigins: this.getUnavailableOrigins(
          availableInboundConnections,
          originsVector,
          i
        ),
        outboundShoulderNights,
        inboundShoulderNights,
      });
    }

    result.sort((a, b) => b.availableOrigins - a.availableOrigins);

    if (take > 0) return result.slice(0, take);

    return result;
  }
}
