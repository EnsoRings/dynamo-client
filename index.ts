const AWS = require('aws-sdk');
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
 */
class DynamoDB {
  private _connection = null;
  private _isVerbose = false;
  private _timestampsEnabled = false;
  private _timestampCreatedField = 'createdAt';
  private _timestampUpdatedField = 'updatedAt';
  constructor(region, options: DynamongoOptions) {
    options = options || {};
    if (region && options.accessKeyId && options.secretAccessKey) {
      // optionally override the environment
      AWS.config.update({
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        region,
      })
    } else if (region) {
      AWS.config.update({ region });
    }
    this._connection = new AWS.DynamoDB.DocumentClient();
    this._isVerbose = options.isVerbose;
    this._timestampsEnabled = options.timestampsEnabled;
    if (options.timestampCreatedField) {
      this._timestampCreatedField = options.timestampCreatedField;
    }
    if (options.timestampUpdatedField) {
      this._timestampUpdatedField = options.timestampUpdatedField;
    }
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
  public async getWhere(table: string, where: object) {
    const expression = this._generateExpression(where, 'AND');
    const params = {
      TableName: table,
      FilterExpression: expression.data,
      ExpressionAttributeValues: expression.values,
      ExpressionAttributeNames: expression.names
    };
    this._log('getWhere()', params);
    return await this._connection.scan(params).promise();
  }
  /**
  */
  public async insert(table: string, data: object) : Promise<object> {
    const params = {
      TableName: table,
      Item: data
    };
    if (this._timestampsEnabled) {
      params.Item[this._timestampCreatedField] = this.unixEpoch();
    }
    this._log('insert()', params);
    return await this._connection.put(params).promise();
  }
  /**
  */
  public async getByKey(table: string, keys: object): Promise<object> {
    const params = {
      TableName: table,
      Key: keys
    };
    this._log('getByKey()', params);
    const response = await this._connection.get(params).promise();
    return (response && response.Item) ? response.Item : response
  }
  /**
  */
  public async updateByKey(table: string, keys: object, data: object): Promise<object>{
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
    return await this._connection.update(params).promise();
  }
  /**
  */
  public async deleteByKey(table: string, keys: object): Promise<object>{
    const params = {
      TableName: table,
      Key: keys
    };
    this._log('deleteByKey()', params);
    return await this._connection.delete(params).promise();
  }
}
/**
 * table-scobed DB instance
 * @param {string} region - dc region
 * @param {string} table - table to scope this instance to
 */
class DynamoTable extends DynamoDB {
  public table = null
  constructor(region, table, options: DynamongoOptions) {
    super(region, options)
    this.table = table
  }
  public getByKey(keys) {
    return super.getByKey(this.table, keys)
  }
  public updateByKey(keys, data) {
    return super.updateByKey(this.table, keys, data)
  }
  public deleteByKey(keys) {
    return super.deleteByKey(this.table, keys)
  }
  public getWhere(data) {
    return super.getWhere(this.table, data)
  }
  public insert(data) {
    return super.insert(this.table, data)
  }
}
module.exports = { DynamoDB, DynamoTable };
