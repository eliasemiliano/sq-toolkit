'use strict';

let Redis = require('ioredis');
let PromiseTool = require('./promise-tool');

const Event = {
    ERROR: 'error',
    READY: 'ready'
};

const ExpiryMode = {
    EX: 'EX',
    PX: 'PX',

    EXPIRE_IN_SECONDS: 'EX',
    EXPIRE_IN_MILLISECONDS: 'PX'
};

const SetMode = {
    NX: 'NX',
    XX: 'XX',
    KEEPTTL: 'KEEPTTL',

    SET_ONLY_IF_NOT_EXISTS: 'NX',
    SET_ONLY_IF_ALREADY_EXISTS: 'XX',
    KEEP_TIME_TO_LIVE: 'KEEPTTL'
};

class RedisClient {

    /**
     * @param {Object}    options
     * @param {WinstonLogger=|DummyLogger=} options.logger
     * @param {Object}    options.filename
     * @param {String=}   options.name
     * @param {String=}   options.host
     * @param {Number=}   options.port
     * @param {Object=}   options.sentinel
     * @param {Boolean=}  options.sentinel.enabled
     * @param {String=}   options.sentinel.name
     * @param {String[]=} options.sentinel.sentinels
     */
    constructor(options= {}) {
        this.client = null;
        this.logger = options.logger || null;
        this.filename = options.filename;
        this.name = options.name;
        this.host = options.host;
        this.port = options.port;
        this.sentinel = options.sentinel;

        this.initialized = false;
    }

    /**
     * @return {Boolean}
     */
    isInitialized() {
        return this.initialized === true;
    }

    /**
     * @return {Object}
     */
    getClientOptions() {
        let options = {
            showFriendlyErrorStack: true
        };

        if (this.sentinel != null && this.sentinel.enabled === true) {
            options = { ...options, ...this.sentinel };
        }
        else {
            options.host = this.host;
            options.port = this.port;
        }

        return options;
    }

    /**
     * @return {Promise.<RedisClient>}
     */
    async init() {
        if (this.isInitialized() === true) {
            return this;
        }

        let options = this.getClientOptions();
        this.client = new Redis(options);
        const deferred = PromiseTool.createDeferred();

        this.client.on(Event.ERROR, err => {
            this.initialized = false;
            if (this.logger != null) {
                this.logger.notify(this.name + ' | Init').steps(0, 100).msg('%s:init Error at init. name:%s host:%s port:%s sentinel:%s. Error: ', this.filename, this.name, this.host, this.port, JSON.stringify(this.sentinel), err);
            }
            deferred.forceReject(err);
        });

        this.client.on(Event.READY, () => {
            this.initialized = true;
            if (this.logger != null) {
                this.logger.info('%s:init Init ok. name:%s host:%s port:%s sentinel:%s', this.filename, this.name, this.host, this.port, JSON.stringify(this.sentinel));
            }
            deferred.forceResolve(this);
        });

        return deferred;
    }

    /* istanbul ignore next */
    /**
     * Set key to hold the string value. If key already holds a value, it is overwritten by default, regardless of its type.
     * Any previous time to live associated with the key is discarded on successful SET operation by default.
     * @reference https://redis.io/commands/set
     * @param {String} key
     * @param {String} value
     * @param {String=} expiryMode
     * @param {Number=} time
     * @param {Number=} setMode
     * @return {Promise}
     */
    set(key, value, expiryMode, time, setMode) {
        return this.client.set(key, value, expiryMode, time, setMode);
    }

    /* istanbul ignore next */
    /**
     * Set key to hold the string value and set key to timeout after a given number of seconds.
     * @reference https://redis.io/commands/setex
     * @param {String} key
     * @param {String} value
     * @param {Number} timeInSeconds
     * @return {Promise}
     */
    setex(key, value, timeInSeconds) {
        return this.set(key, value, ExpiryMode.EX, timeInSeconds);
    }

    /* istanbul ignore next */
    /**
     * Set key to hold the string value and set key to timeout after a given number of seconds.
     * @reference https://redis.io/commands/psetex
     * @param {String} key
     * @param {String} value
     * @param {Number} timeInMilliseconds
     * @return {Promise}
     */
    psetex(key, value, timeInMilliseconds) {
        return this.set(key, value, ExpiryMode.PX, timeInMilliseconds);
    }

    /* istanbul ignore next */
    /**
     * Set key to hold the string value and set key to timeout after a given number of milliseconds.
     * @reference https://redis.io/commands/setnx
     * @param {String} key
     * @param {String} value
     * @return {Promise}
     */
    setnx(key, value) {
        return this.set(key, value, null, null, SetMode.NX);
    }

    /* istanbul ignore next */
    /**
     * Get the value of key. If the key does not exist null is returned.
     * @reference https://redis.io/commands/get
     * @param {String} key
     * @return {Promise.<String|null>}
     */
    async get(key) {
        const value = await this.client.get(key);
        return value != null ? value : null;
    }

    /* istanbul ignore next */
    /**
     * Returns the value associated with field in the hash stored at key
     * @reference https://redis.io/commands/hget
     * @param {String} hash
     * @param {String} field
     * @return {Promise<String|null>}
     */
    hget(hash, field) {
        return this.client.hget(hash, field);
    }

    /* istanbul ignore next */
    /**
     * Returns the values associated with the specified fields in the hash stored at key.
     * @reference https://redis.io/commands/hmget
     * @param {String} hash
     * @param {String[]} fields
     * @return {Promise.<Array<String|null>>}
     */
    hmget(hash, fields) {
        return this.client.hmget(hash, fields);
    }

    /* istanbul ignore next */
    /**
     * Returns all fields and values of the hash stored at key. In the returned value, every field name is followed by its value, so the length of the reply is twice the size of the hash.
     * @reference https://redis.io/commands/hgetall
     * @param {String} hash
     * @return {Promise<Record<String, String>>}
     */
    hgetall(hash) {
        return this.client.hgetall(hash);
    }

    /* istanbul ignore next */
    /**
     * Sets field in the hash stored at key to value. If key does not exist, a new key holding a hash is created.
     * If field already exists in the hash, it is overwritten.
     * @reference https://redis.io/commands/hset
     * @param {String} hash
     * @param {String|String[]} values
     * @return {Promise<IORedis.BooleanResponse>}
     */
    hset(hash, values) {
        return this.client.hset(hash, values);
    }

    /* istanbul ignore next */
    /**
     * Removes the specified keys. A key is ignored if it does not exist.
     * @reference https://redis.io/commands/del
     * @param {String|String[]} key
     * @return {Promise<Number>}
     */
    del(key) {
        return this.client.del(key);
    }

    /* istanbul ignore next */
    /**
     * Delete all the keys of all the existing databases. This command never fails.
     * @reference https://redis.io/commands/flushall
     * @return {Promise}
     */
    flushAll() {
        return this.client.flushall();
    }
}

RedisClient.ExpiryMode = ExpiryMode;
RedisClient.SetMode = SetMode;

module.exports = RedisClient;
