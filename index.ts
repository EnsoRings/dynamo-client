import { DynamoDB, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"

interface DynamongoOptions {
  isVerbose?: boolean,
  timestampsEnabled?: boolean,
  timestampCreatedField?: string,
  timestampUpdatedField?: string,
  accessKeyId?: string,
  secretAccessKey?: string,
}
interface DynamongoExpression {
  data: string,
  values: object,
  names: object
}

/**
 * @link https://github.com/aws/aws-sdk-js-v3/blob/main/lib/lib-dynamodb/README.md
*/
class DynamoDBClient {
  private _connection = null;
  private _client = null;
  private _isVerbose = false;
  private _timestampsEnabled = false;
  private _timestampCreatedField = 'createdAt';
  private _timestampUpdatedField = 'updatedAt';
  /**
   * if you have non-standard environment variables, you'll need to setup the
   * AWS sdk config.
   * ```
   * AWS.config.update({
   *   accessKeyId
   *   secretAccessKey
   * })
   * ```
   */
  constructor(region, options: DynamongoOptions) {
    options = options || {};
    this._isVerbose = options.isVerbose;
    this._timestampsEnabled = options.timestampsEnabled;
    if (options.timestampCreatedField) {
      this._timestampCreatedField = options.timestampCreatedField;
    }
    if (options.timestampUpdatedField) {
      this._timestampUpdatedField = options.timestampUpdatedField;
    }
    let clientOptions: DynamoDBClientConfig = { region };
    if (options.accessKeyId && options.secretAccessKey) {
      clientOptions.credentials = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      };
    }
    // setup dynamodb
    this._client = new DynamoDB(clientOptions);
    this._connection = DynamoDBDocument.from(this._client, {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true
      }
    });
  }
  private _log(...args): void {
    this._isVerbose && console.log('Dynamongo: ', ...args);
  }
  /**
  */
  _generateExpression(data: object, expressionSeparator: string): DynamongoExpression  {
    const expressionData = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    Object.keys(data).forEach((key, index) => {
      key = key.replace(/[^A-Za-z]/gi, '');
      expressionData.push(`#${index} = :val${index}`);
      expressionAttributeValues[`:val${index}`] = data[key];
      expressionAttributeNames[`#${index}`] = key;
    });
    return {
      data: expressionData.join(` ${expressionSeparator} `),
      values: expressionAttributeValues,
      names: expressionAttributeNames
    }
  }
  /**
   * Date.now() gives a valid unix time in ms, but dynamodb ttl only works with a
   * resolution of *seconds* since unix epoch.
   */
  public unixEpoch() {
    return Math.trunc(Date.now() / 1000);
  }
  /**
  */
  public getConnection() {
    return this._connection;
  }
  /**
  */
  public async getByKey<T>(table: string, keys: object): Promise<T> {
    const params = {
      TableName: table,
      Key: keys
    };
    this._log('getByKey()', params);
    const response = await this._connection.get(params)
    return (response && response.Item) ? response.Item : response;
  }
  /**
  */
  public updateByKey<T>(table: string, keys: object, data: object): Promise<T>{
    if (this._timestampsEnabled) {
      data[this._timestampUpdatedField] = this.unixEpoch();
    }
    const expression = this._generateExpression(data, ',');
    const params = {
      TableName: table,
      Key: keys,
      UpdateExpression: `SET ${expression.data}`,
      ExpressionAttributeValues: expression.values,
      ExpressionAttributeNames: expression.names,
      ReturnValues: "UPDATED_NEW"
    };
    this._log('updateByKey()', params);
    return this._connection.update(params)
  }
  /**
  */
  public deleteByKey<T>(table: string, keys: object): Promise<T> {
    const params = {
      TableName: table,
      Key: keys
    };
    this._log('deleteByKey()', params);
    return this._connection.delete(params)
  }
  /**
  */
  public getWhere<T>(table: string, where: object): Promise<T> {
    const expression = this._generateExpression(where, 'AND');
    const params = {
      TableName: table,
      FilterExpression: expression.data,
      ExpressionAttributeValues: expression.values,
      ExpressionAttributeNames: expression.names
    };
    this._log('getWhere()', params);
    return this._connection.scan(params)
  }
  /**
  */
  public insert<T>(table: string, data: object) : Promise<T> {
    const params = {
      TableName: table,
      Item: data
    };
    if (this._timestampsEnabled) {
      params.Item[this._timestampCreatedField] = this.unixEpoch();
    }
    this._log('insert()', params);
    return this._connection.put(params)
  }
}
/**
 * table-scobed DB instance
 * @param {string} region - dc region
 * @param {string} table - table to scope this instance to
 */
class DynamoTable extends DynamoDBClient {
  public table = null
  constructor(region, table, options: DynamongoOptions) {
    super(region, options);
    this.table = table;
  }
  public getByKey<T>(keys) {
    return super.getByKey<T>(this.table, keys);
  }
  public updateByKey<T>(keys, data) {
    return super.updateByKey<T>(this.table, keys, data);
  }
  public deleteByKey<T>(keys) {
    return super.deleteByKey<T>(this.table, keys);
  }
  public getWhere<T>(data) {
    return super.getWhere<T>(this.table, data);
  }
  public insert<T>(data) {
    return super.insert<T>(this.table, data);
  }
}

export {
  DynamoDBClient as DynamoDB,
  DynamoTable
}
