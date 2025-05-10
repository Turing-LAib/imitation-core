const { MongoClient, ObjectId } = require('mongodb');

class MongoDB {
    constructor(config = {}) {
        this.config = {
            url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                ...config.options
            },
            ...config
        };

        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async connect() {
        if (this.isConnected) return this.db;
        console.log('Begin Connect');
        try {
            this.client = await MongoClient.connect(
                this.config.url,
                this.config.options
            );

            this.db = this.client.db(this.config.dbName);
            this.isConnected = true;
            this.retryCount = 0;
            console.log('MongoDB connected successfully');
            return this.db;
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Connection retry attempt ${this.retryCount}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
                return this.connect();
            }
            throw new Error(`MongoDB connection failed: ${error.message}`);
        }
    }

    async close() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log('MongoDB connection closed');
        }
    }

    async insert(collectionName, document, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            await collection.insertOne(document, options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async insertMany(collectionName, document, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            await collection.insertMany(document, options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async find(collectionName, query = {}, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            return await collection.find(query, options).toArray();
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async findOne(collectionName, query = {}, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            return await collection.findOne(query, options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async update(collectionName, filter, update, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            await collection.updateOne(filter, { $set: update }, options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateMany(collectionName, query = {}, update = {}) {
        try {
            const collection = this.db.collection(collectionName);
            await collection.updateMany(query, { $set: update });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(collectionName, filter, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            return await collection.deleteOne(filter, options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async deleteMany(collectionName, filter, options = {}) {
        try {
            const collection = this.db.collection(collectionName);
            return await collection.deleteMany(filter, options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    objectId(id) {
        return ObjectId(id);
    }

    handleError(error) {
        console.error('MongoDB Error:', error);
        return new Error(`Database operation failed: ${error.message}`);
    }
}

module.exports = new MongoDB();