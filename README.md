# enso-rings/dynamo-client

a simplified client interface for dynamodb.

## Getting Started

To get a local copy up and running follow these simple example steps.

### Prerequisites

Install the dynamo-client package into your project

```sh
npm install @enso-rings/dynamo-client
```

## Usage

Get a dynamo-client instance: enter the region and optionally an object with
supported options. `DynamoTable` supports all of the same methods, but provides
a convenient shorthand when making repeated changes to the same table.

```js
const { DynamoDB, DynamoTable } = require('@enso-rings/dynamo-client')
const db = new DynamoDB('eu-west-1', {
	isVerbose: true,
	timestampsEnabled: true,
	timestampCreatedField: 'createdAt',
	timestampUpdatedField: 'updatedAt'
});
// "table scoped" db client
const table = new DynamoTable('ap-east-1', 'my-table-name', {
	isVerbose: true,
	timestampsEnabled: true,
	timestampCreatedField: 'createdAt',
	timestampUpdatedField: 'updatedAt'
})
```

Now you are ready to use this instance for querying the database.

### getByKey(table, keys)

```js
const data = await db.getByKey('my-db-table', {customId: 'abc-123'});
```

### updateByKey(table, keys, data)

```js
const result = await db.updateByKey('my-db-table',
  {customId: 'abc-123'},
  {newData: '123'}
);
```

### deleteByKey(table, keys)

```js
const result = await db.deleteByKey('my-db-table', {customId: 'abc-123'});
```

### getWhere(table, data)

```js
const data = await db.getWhere('my-db-table', {
  firstName: 'Kevin',
  lastName: 'Van Ryckegem'
});
```

### insert(table, data)

Note, by default, if data exists with the same keys, the data will be updated!

```js
const result = await db.insert('my-db-table', {
  firstName: 'Kevin',
  lastName: 'Table'
});
```

## Roadmap

See the [open issues](https://gitlab/EnsoRings/dynamo-client/issues) for a
list of proposed features (and known issues).

## Contributing

Contributions are what make the open source community such an amazing place to
be learn, inspire, and create. Any contributions you make are
**greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.

