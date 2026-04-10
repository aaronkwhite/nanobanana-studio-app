/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "vq9y3vfrygqmfci",
    "created": "2026-04-10 02:05:43.440Z",
    "updated": "2026-04-10 02:05:43.440Z",
    "name": "job_items",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "lvy4vds9",
        "name": "job_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "30rydnht5746fex",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": []
        }
      },
      {
        "system": false,
        "id": "jg8v8oll",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "processing",
            "complete",
            "failed"
          ]
        }
      },
      {
        "system": false,
        "id": "madw2sck",
        "name": "prompt",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "jppkak3e",
        "name": "resolution",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "1K",
            "2K",
            "4K"
          ]
        }
      },
      {
        "system": false,
        "id": "cstmxqq0",
        "name": "output_url",
        "type": "url",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
        }
      },
      {
        "system": false,
        "id": "sw3m1km5",
        "name": "error",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id = job_id.user_id",
    "viewRule": "@request.auth.id = job_id.user_id",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("vq9y3vfrygqmfci");

  return dao.deleteCollection(collection);
})
