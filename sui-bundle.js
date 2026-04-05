(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod2) => function __require() {
    return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));

  // node_modules/bech32/dist/index.js
  var require_dist = __commonJS({
    "node_modules/bech32/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.bech32m = exports.bech32 = void 0;
      var ALPHABET2 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
      var ALPHABET_MAP = {};
      for (let z = 0; z < ALPHABET2.length; z++) {
        const x = ALPHABET2.charAt(z);
        ALPHABET_MAP[x] = z;
      }
      function polymodStep(pre) {
        const b = pre >> 25;
        return (pre & 33554431) << 5 ^ -(b >> 0 & 1) & 996825010 ^ -(b >> 1 & 1) & 642813549 ^ -(b >> 2 & 1) & 513874426 ^ -(b >> 3 & 1) & 1027748829 ^ -(b >> 4 & 1) & 705979059;
      }
      function prefixChk(prefix) {
        let chk = 1;
        for (let i = 0; i < prefix.length; ++i) {
          const c = prefix.charCodeAt(i);
          if (c < 33 || c > 126)
            return "Invalid prefix (" + prefix + ")";
          chk = polymodStep(chk) ^ c >> 5;
        }
        chk = polymodStep(chk);
        for (let i = 0; i < prefix.length; ++i) {
          const v = prefix.charCodeAt(i);
          chk = polymodStep(chk) ^ v & 31;
        }
        return chk;
      }
      function convert(data, inBits, outBits, pad) {
        let value = 0;
        let bits = 0;
        const maxV = (1 << outBits) - 1;
        const result = [];
        for (let i = 0; i < data.length; ++i) {
          value = value << inBits | data[i];
          bits += inBits;
          while (bits >= outBits) {
            bits -= outBits;
            result.push(value >> bits & maxV);
          }
        }
        if (pad) {
          if (bits > 0) {
            result.push(value << outBits - bits & maxV);
          }
        } else {
          if (bits >= inBits)
            return "Excess padding";
          if (value << outBits - bits & maxV)
            return "Non-zero padding";
        }
        return result;
      }
      function toWords(bytes) {
        return convert(bytes, 8, 5, true);
      }
      function fromWordsUnsafe(words) {
        const res = convert(words, 5, 8, false);
        if (Array.isArray(res))
          return res;
      }
      function fromWords(words) {
        const res = convert(words, 5, 8, false);
        if (Array.isArray(res))
          return res;
        throw new Error(res);
      }
      function getLibraryFromEncoding(encoding) {
        let ENCODING_CONST;
        if (encoding === "bech32") {
          ENCODING_CONST = 1;
        } else {
          ENCODING_CONST = 734539939;
        }
        function encode(prefix, words, LIMIT) {
          LIMIT = LIMIT || 90;
          if (prefix.length + 7 + words.length > LIMIT)
            throw new TypeError("Exceeds length limit");
          prefix = prefix.toLowerCase();
          let chk = prefixChk(prefix);
          if (typeof chk === "string")
            throw new Error(chk);
          let result = prefix + "1";
          for (let i = 0; i < words.length; ++i) {
            const x = words[i];
            if (x >> 5 !== 0)
              throw new Error("Non 5-bit word");
            chk = polymodStep(chk) ^ x;
            result += ALPHABET2.charAt(x);
          }
          for (let i = 0; i < 6; ++i) {
            chk = polymodStep(chk);
          }
          chk ^= ENCODING_CONST;
          for (let i = 0; i < 6; ++i) {
            const v = chk >> (5 - i) * 5 & 31;
            result += ALPHABET2.charAt(v);
          }
          return result;
        }
        function __decode(str, LIMIT) {
          LIMIT = LIMIT || 90;
          if (str.length < 8)
            return str + " too short";
          if (str.length > LIMIT)
            return "Exceeds length limit";
          const lowered = str.toLowerCase();
          const uppered = str.toUpperCase();
          if (str !== lowered && str !== uppered)
            return "Mixed-case string " + str;
          str = lowered;
          const split2 = str.lastIndexOf("1");
          if (split2 === -1)
            return "No separator character for " + str;
          if (split2 === 0)
            return "Missing prefix for " + str;
          const prefix = str.slice(0, split2);
          const wordChars = str.slice(split2 + 1);
          if (wordChars.length < 6)
            return "Data too short";
          let chk = prefixChk(prefix);
          if (typeof chk === "string")
            return chk;
          const words = [];
          for (let i = 0; i < wordChars.length; ++i) {
            const c = wordChars.charAt(i);
            const v = ALPHABET_MAP[c];
            if (v === void 0)
              return "Unknown character " + c;
            chk = polymodStep(chk) ^ v;
            if (i + 6 >= wordChars.length)
              continue;
            words.push(v);
          }
          if (chk !== ENCODING_CONST)
            return "Invalid checksum for " + str;
          return { prefix, words };
        }
        function decodeUnsafe(str, LIMIT) {
          const res = __decode(str, LIMIT);
          if (typeof res === "object")
            return res;
        }
        function decode(str, LIMIT) {
          const res = __decode(str, LIMIT);
          if (typeof res === "object")
            return res;
          throw new Error(res);
        }
        return {
          decodeUnsafe,
          decode,
          encode,
          toWords,
          fromWordsUnsafe,
          fromWords
        };
      }
      exports.bech32 = getLibraryFromEncoding("bech32");
      exports.bech32m = getLibraryFromEncoding("bech32m");
    }
  });

  // node_modules/@mysten/sui/dist/esm/version.js
  var PACKAGE_VERSION = "1.21.1";
  var TARGETED_RPC_VERSION = "1.42.0";

  // node_modules/@mysten/sui/dist/esm/client/errors.js
  var CODE_TO_ERROR_TYPE = {
    "-32700": "ParseError",
    "-32701": "OversizedRequest",
    "-32702": "OversizedResponse",
    "-32600": "InvalidRequest",
    "-32601": "MethodNotFound",
    "-32602": "InvalidParams",
    "-32603": "InternalError",
    "-32604": "ServerBusy",
    "-32000": "CallExecutionFailed",
    "-32001": "UnknownError",
    "-32003": "SubscriptionClosed",
    "-32004": "SubscriptionClosedWithError",
    "-32005": "BatchesNotSupported",
    "-32006": "TooManySubscriptions",
    "-32050": "TransientError",
    "-32002": "TransactionExecutionClientError"
  };
  var SuiHTTPTransportError = class extends Error {
  };
  var JsonRpcError = class extends SuiHTTPTransportError {
    constructor(message, code) {
      super(message);
      this.code = code;
      this.type = CODE_TO_ERROR_TYPE[code] ?? "ServerError";
    }
  };
  var SuiHTTPStatusError = class extends SuiHTTPTransportError {
    constructor(message, status, statusText) {
      super(message);
      this.status = status;
      this.statusText = statusText;
    }
  };

  // node_modules/@mysten/sui/dist/esm/client/rpc-websocket-client.js
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });
  var _requestId;
  var _disconnects;
  var _webSocket;
  var _connectionPromise;
  var _subscriptions;
  var _pendingRequests;
  var _WebsocketClient_instances;
  var setupWebSocket_fn;
  var reconnect_fn;
  function getWebsocketUrl(httpUrl) {
    const url = new URL(httpUrl);
    url.protocol = url.protocol.replace("http", "ws");
    return url.toString();
  }
  var DEFAULT_CLIENT_OPTIONS = {
    // We fudge the typing because we also check for undefined in the constructor:
    WebSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : void 0,
    callTimeout: 3e4,
    reconnectTimeout: 3e3,
    maxReconnects: 5
  };
  var WebsocketClient = class {
    constructor(endpoint, options = {}) {
      __privateAdd(this, _WebsocketClient_instances);
      __privateAdd(this, _requestId, 0);
      __privateAdd(this, _disconnects, 0);
      __privateAdd(this, _webSocket, null);
      __privateAdd(this, _connectionPromise, null);
      __privateAdd(this, _subscriptions, /* @__PURE__ */ new Set());
      __privateAdd(this, _pendingRequests, /* @__PURE__ */ new Map());
      this.endpoint = endpoint;
      this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options };
      if (!this.options.WebSocketConstructor) {
        throw new Error("Missing WebSocket constructor");
      }
      if (this.endpoint.startsWith("http")) {
        this.endpoint = getWebsocketUrl(this.endpoint);
      }
    }
    async makeRequest(method, params) {
      const webSocket = await __privateMethod(this, _WebsocketClient_instances, setupWebSocket_fn).call(this);
      return new Promise((resolve, reject) => {
        __privateSet(this, _requestId, __privateGet(this, _requestId) + 1);
        __privateGet(this, _pendingRequests).set(__privateGet(this, _requestId), {
          resolve,
          reject,
          timeout: setTimeout(() => {
            __privateGet(this, _pendingRequests).delete(__privateGet(this, _requestId));
            reject(new Error(`Request timeout: ${method}`));
          }, this.options.callTimeout)
        });
        webSocket.send(JSON.stringify({ jsonrpc: "2.0", id: __privateGet(this, _requestId), method, params }));
      }).then(({ error, result }) => {
        if (error) {
          throw new JsonRpcError(error.message, error.code);
        }
        return result;
      });
    }
    async subscribe(input) {
      const subscription = new RpcSubscription(input);
      __privateGet(this, _subscriptions).add(subscription);
      await subscription.subscribe(this);
      return () => subscription.unsubscribe(this);
    }
  };
  _requestId = /* @__PURE__ */ new WeakMap();
  _disconnects = /* @__PURE__ */ new WeakMap();
  _webSocket = /* @__PURE__ */ new WeakMap();
  _connectionPromise = /* @__PURE__ */ new WeakMap();
  _subscriptions = /* @__PURE__ */ new WeakMap();
  _pendingRequests = /* @__PURE__ */ new WeakMap();
  _WebsocketClient_instances = /* @__PURE__ */ new WeakSet();
  setupWebSocket_fn = function() {
    if (__privateGet(this, _connectionPromise)) {
      return __privateGet(this, _connectionPromise);
    }
    __privateSet(this, _connectionPromise, new Promise((resolve) => {
      __privateGet(this, _webSocket)?.close();
      __privateSet(this, _webSocket, new this.options.WebSocketConstructor(this.endpoint));
      __privateGet(this, _webSocket).addEventListener("open", () => {
        __privateSet(this, _disconnects, 0);
        resolve(__privateGet(this, _webSocket));
      });
      __privateGet(this, _webSocket).addEventListener("close", () => {
        __privateWrapper(this, _disconnects)._++;
        if (__privateGet(this, _disconnects) <= this.options.maxReconnects) {
          setTimeout(() => {
            __privateMethod(this, _WebsocketClient_instances, reconnect_fn).call(this);
          }, this.options.reconnectTimeout);
        }
      });
      __privateGet(this, _webSocket).addEventListener("message", ({ data }) => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (error) {
          console.error(new Error(`Failed to parse RPC message: ${data}`, { cause: error }));
          return;
        }
        if ("id" in json && json.id != null && __privateGet(this, _pendingRequests).has(json.id)) {
          const { resolve: resolve2, timeout } = __privateGet(this, _pendingRequests).get(json.id);
          clearTimeout(timeout);
          resolve2(json);
        } else if ("params" in json) {
          const { params } = json;
          __privateGet(this, _subscriptions).forEach((subscription) => {
            if (subscription.subscriptionId === params.subscription) {
              if (params.subscription === subscription.subscriptionId) {
                subscription.onMessage(params.result);
              }
            }
          });
        }
      });
    }));
    return __privateGet(this, _connectionPromise);
  };
  reconnect_fn = async function() {
    __privateGet(this, _webSocket)?.close();
    __privateSet(this, _connectionPromise, null);
    return Promise.allSettled(
      [...__privateGet(this, _subscriptions)].map((subscription) => subscription.subscribe(this))
    );
  };
  var RpcSubscription = class {
    constructor(input) {
      this.subscriptionId = null;
      this.subscribed = false;
      this.input = input;
    }
    onMessage(message) {
      if (this.subscribed) {
        this.input.onMessage(message);
      }
    }
    async unsubscribe(client) {
      const { subscriptionId } = this;
      this.subscribed = false;
      if (subscriptionId == null) return false;
      this.subscriptionId = null;
      return client.makeRequest(this.input.unsubscribe, [subscriptionId]);
    }
    async subscribe(client) {
      this.subscriptionId = null;
      this.subscribed = true;
      const newSubscriptionId = await client.makeRequest(
        this.input.method,
        this.input.params
      );
      if (this.subscribed) {
        this.subscriptionId = newSubscriptionId;
      }
    }
  };

  // node_modules/@mysten/sui/dist/esm/client/http-transport.js
  var __typeError2 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck2 = (obj, member, msg) => member.has(obj) || __typeError2("Cannot " + msg);
  var __privateGet2 = (obj, member, getter) => (__accessCheck2(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd2 = (obj, member, value) => member.has(obj) ? __typeError2("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet2 = (obj, member, value, setter) => (__accessCheck2(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod2 = (obj, member, method) => (__accessCheck2(obj, member, "access private method"), method);
  var _requestId2;
  var _options;
  var _websocketClient;
  var _SuiHTTPTransport_instances;
  var getWebsocketClient_fn;
  var SuiHTTPTransport = class {
    constructor(options) {
      __privateAdd2(this, _SuiHTTPTransport_instances);
      __privateAdd2(this, _requestId2, 0);
      __privateAdd2(this, _options);
      __privateAdd2(this, _websocketClient);
      __privateSet2(this, _options, options);
    }
    fetch(input, init) {
      const fetchFn = __privateGet2(this, _options).fetch ?? fetch;
      if (!fetchFn) {
        throw new Error(
          "The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport."
        );
      }
      return fetchFn(input, init);
    }
    async request(input) {
      __privateSet2(this, _requestId2, __privateGet2(this, _requestId2) + 1);
      const res = await this.fetch(__privateGet2(this, _options).rpc?.url ?? __privateGet2(this, _options).url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Sdk-Type": "typescript",
          "Client-Sdk-Version": PACKAGE_VERSION,
          "Client-Target-Api-Version": TARGETED_RPC_VERSION,
          "Client-Request-Method": input.method,
          ...__privateGet2(this, _options).rpc?.headers
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: __privateGet2(this, _requestId2),
          method: input.method,
          params: input.params
        })
      });
      if (!res.ok) {
        throw new SuiHTTPStatusError(
          `Unexpected status code: ${res.status}`,
          res.status,
          res.statusText
        );
      }
      const data = await res.json();
      if ("error" in data && data.error != null) {
        throw new JsonRpcError(data.error.message, data.error.code);
      }
      return data.result;
    }
    async subscribe(input) {
      const unsubscribe = await __privateMethod2(this, _SuiHTTPTransport_instances, getWebsocketClient_fn).call(this).subscribe(input);
      return async () => !!await unsubscribe();
    }
  };
  _requestId2 = /* @__PURE__ */ new WeakMap();
  _options = /* @__PURE__ */ new WeakMap();
  _websocketClient = /* @__PURE__ */ new WeakMap();
  _SuiHTTPTransport_instances = /* @__PURE__ */ new WeakSet();
  getWebsocketClient_fn = function() {
    if (!__privateGet2(this, _websocketClient)) {
      const WebSocketConstructor = __privateGet2(this, _options).WebSocketConstructor ?? WebSocket;
      if (!WebSocketConstructor) {
        throw new Error(
          "The current environment does not support WebSocket, you can provide a WebSocketConstructor in the options for SuiHTTPTransport."
        );
      }
      __privateSet2(this, _websocketClient, new WebsocketClient(
        __privateGet2(this, _options).websocket?.url ?? __privateGet2(this, _options).url,
        {
          WebSocketConstructor,
          ...__privateGet2(this, _options).websocket
        }
      ));
    }
    return __privateGet2(this, _websocketClient);
  };

  // node_modules/base-x/src/esm/index.js
  function base(ALPHABET2) {
    if (ALPHABET2.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    const BASE_MAP = new Uint8Array(256);
    for (let j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (let i = 0; i < ALPHABET2.length; i++) {
      const x = ALPHABET2.charAt(i);
      const xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i;
    }
    const BASE = ALPHABET2.length;
    const LEADER = ALPHABET2.charAt(0);
    const FACTOR = Math.log(BASE) / Math.log(256);
    const iFACTOR = Math.log(256) / Math.log(BASE);
    function encode(source) {
      if (source instanceof Uint8Array) {
      } else if (ArrayBuffer.isView(source)) {
        source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      } else if (Array.isArray(source)) {
        source = Uint8Array.from(source);
      }
      if (!(source instanceof Uint8Array)) {
        throw new TypeError("Expected Uint8Array");
      }
      if (source.length === 0) {
        return "";
      }
      let zeroes = 0;
      let length = 0;
      let pbegin = 0;
      const pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      const size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      const b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        let carry = source[pbegin];
        let i = 0;
        for (let it1 = size - 1; (carry !== 0 || i < length) && it1 !== -1; it1--, i++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length = i;
        pbegin++;
      }
      let it2 = size - length;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      let str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += ALPHABET2.charAt(b58[it2]);
      }
      return str;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return new Uint8Array();
      }
      let psz = 0;
      let zeroes = 0;
      let length = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      const size = (source.length - psz) * FACTOR + 1 >>> 0;
      const b256 = new Uint8Array(size);
      while (psz < source.length) {
        const charCode = source.charCodeAt(psz);
        if (charCode > 255) {
          return;
        }
        let carry = BASE_MAP[charCode];
        if (carry === 255) {
          return;
        }
        let i = 0;
        for (let it3 = size - 1; (carry !== 0 || i < length) && it3 !== -1; it3--, i++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length = i;
        psz++;
      }
      let it4 = size - length;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      const vch = new Uint8Array(zeroes + (size - it4));
      let j = zeroes;
      while (it4 !== size) {
        vch[j++] = b256[it4++];
      }
      return vch;
    }
    function decode(string2) {
      const buffer = decodeUnsafe(string2);
      if (buffer) {
        return buffer;
      }
      throw new Error("Non-base" + BASE + " character");
    }
    return {
      encode,
      decodeUnsafe,
      decode
    };
  }
  var esm_default = base;

  // node_modules/bs58/src/esm/index.js
  var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  var esm_default2 = esm_default(ALPHABET);

  // node_modules/@mysten/bcs/dist/esm/b58.js
  var toBase58 = (buffer) => esm_default2.encode(buffer);
  var fromBase58 = (str) => esm_default2.decode(str);

  // node_modules/@mysten/bcs/dist/esm/b64.js
  function fromBase64(base64String2) {
    return Uint8Array.from(atob(base64String2), (char) => char.charCodeAt(0));
  }
  var CHUNK_SIZE = 8192;
  function toBase64(bytes) {
    if (bytes.length < CHUNK_SIZE) {
      return btoa(String.fromCharCode(...bytes));
    }
    let output = "";
    for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk2 = bytes.slice(i, i + CHUNK_SIZE);
      output += String.fromCharCode(...chunk2);
    }
    return btoa(output);
  }

  // node_modules/@mysten/bcs/dist/esm/hex.js
  function fromHex(hexStr) {
    const normalized = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
    const padded = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
    const intArr = padded.match(/[0-9a-fA-F]{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [];
    if (intArr.length !== padded.length / 2) {
      throw new Error(`Invalid hex string ${hexStr}`);
    }
    return Uint8Array.from(intArr);
  }
  function toHex(bytes) {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
  }

  // node_modules/@mysten/bcs/dist/esm/uleb.js
  function ulebEncode(num) {
    let arr = [];
    let len = 0;
    if (num === 0) {
      return [0];
    }
    while (num > 0) {
      arr[len] = num & 127;
      if (num >>= 7) {
        arr[len] |= 128;
      }
      len += 1;
    }
    return arr;
  }
  function ulebDecode(arr) {
    let total = 0;
    let shift = 0;
    let len = 0;
    while (true) {
      let byte = arr[len];
      len += 1;
      total |= (byte & 127) << shift;
      if ((byte & 128) === 0) {
        break;
      }
      shift += 7;
    }
    return {
      value: total,
      length: len
    };
  }

  // node_modules/@mysten/bcs/dist/esm/reader.js
  var BcsReader = class {
    /**
     * @param {Uint8Array} data Data to use as a buffer.
     */
    constructor(data) {
      this.bytePosition = 0;
      this.dataView = new DataView(data.buffer);
    }
    /**
     * Shift current cursor position by `bytes`.
     *
     * @param {Number} bytes Number of bytes to
     * @returns {this} Self for possible chaining.
     */
    shift(bytes) {
      this.bytePosition += bytes;
      return this;
    }
    /**
     * Read U8 value from the buffer and shift cursor by 1.
     * @returns
     */
    read8() {
      let value = this.dataView.getUint8(this.bytePosition);
      this.shift(1);
      return value;
    }
    /**
     * Read U16 value from the buffer and shift cursor by 2.
     * @returns
     */
    read16() {
      let value = this.dataView.getUint16(this.bytePosition, true);
      this.shift(2);
      return value;
    }
    /**
     * Read U32 value from the buffer and shift cursor by 4.
     * @returns
     */
    read32() {
      let value = this.dataView.getUint32(this.bytePosition, true);
      this.shift(4);
      return value;
    }
    /**
     * Read U64 value from the buffer and shift cursor by 8.
     * @returns
     */
    read64() {
      let value1 = this.read32();
      let value2 = this.read32();
      let result = value2.toString(16) + value1.toString(16).padStart(8, "0");
      return BigInt("0x" + result).toString(10);
    }
    /**
     * Read U128 value from the buffer and shift cursor by 16.
     */
    read128() {
      let value1 = BigInt(this.read64());
      let value2 = BigInt(this.read64());
      let result = value2.toString(16) + value1.toString(16).padStart(16, "0");
      return BigInt("0x" + result).toString(10);
    }
    /**
     * Read U128 value from the buffer and shift cursor by 32.
     * @returns
     */
    read256() {
      let value1 = BigInt(this.read128());
      let value2 = BigInt(this.read128());
      let result = value2.toString(16) + value1.toString(16).padStart(32, "0");
      return BigInt("0x" + result).toString(10);
    }
    /**
     * Read `num` number of bytes from the buffer and shift cursor by `num`.
     * @param num Number of bytes to read.
     */
    readBytes(num) {
      let start = this.bytePosition + this.dataView.byteOffset;
      let value = new Uint8Array(this.dataView.buffer, start, num);
      this.shift(num);
      return value;
    }
    /**
     * Read ULEB value - an integer of varying size. Used for enum indexes and
     * vector lengths.
     * @returns {Number} The ULEB value.
     */
    readULEB() {
      let start = this.bytePosition + this.dataView.byteOffset;
      let buffer = new Uint8Array(this.dataView.buffer, start);
      let { value, length } = ulebDecode(buffer);
      this.shift(length);
      return value;
    }
    /**
     * Read a BCS vector: read a length and then apply function `cb` X times
     * where X is the length of the vector, defined as ULEB in BCS bytes.
     * @param cb Callback to process elements of vector.
     * @returns {Array<Any>} Array of the resulting values, returned by callback.
     */
    readVec(cb) {
      let length = this.readULEB();
      let result = [];
      for (let i = 0; i < length; i++) {
        result.push(cb(this, i, length));
      }
      return result;
    }
  };

  // node_modules/@mysten/bcs/dist/esm/utils.js
  function encodeStr(data, encoding) {
    switch (encoding) {
      case "base58":
        return toBase58(data);
      case "base64":
        return toBase64(data);
      case "hex":
        return toHex(data);
      default:
        throw new Error("Unsupported encoding, supported values are: base64, hex");
    }
  }
  function splitGenericParameters(str, genericSeparators = ["<", ">"]) {
    const [left, right] = genericSeparators;
    const tok = [];
    let word = "";
    let nestedAngleBrackets = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === left) {
        nestedAngleBrackets++;
      }
      if (char === right) {
        nestedAngleBrackets--;
      }
      if (nestedAngleBrackets === 0 && char === ",") {
        tok.push(word.trim());
        word = "";
        continue;
      }
      word += char;
    }
    tok.push(word.trim());
    return tok;
  }

  // node_modules/@mysten/bcs/dist/esm/writer.js
  var BcsWriter = class {
    constructor({
      initialSize = 1024,
      maxSize = Infinity,
      allocateSize = 1024
    } = {}) {
      this.bytePosition = 0;
      this.size = initialSize;
      this.maxSize = maxSize;
      this.allocateSize = allocateSize;
      this.dataView = new DataView(new ArrayBuffer(initialSize));
    }
    ensureSizeOrGrow(bytes) {
      const requiredSize = this.bytePosition + bytes;
      if (requiredSize > this.size) {
        const nextSize = Math.min(this.maxSize, this.size + this.allocateSize);
        if (requiredSize > nextSize) {
          throw new Error(
            `Attempting to serialize to BCS, but buffer does not have enough size. Allocated size: ${this.size}, Max size: ${this.maxSize}, Required size: ${requiredSize}`
          );
        }
        this.size = nextSize;
        const nextBuffer = new ArrayBuffer(this.size);
        new Uint8Array(nextBuffer).set(new Uint8Array(this.dataView.buffer));
        this.dataView = new DataView(nextBuffer);
      }
    }
    /**
     * Shift current cursor position by `bytes`.
     *
     * @param {Number} bytes Number of bytes to
     * @returns {this} Self for possible chaining.
     */
    shift(bytes) {
      this.bytePosition += bytes;
      return this;
    }
    /**
     * Write a U8 value into a buffer and shift cursor position by 1.
     * @param {Number} value Value to write.
     * @returns {this}
     */
    write8(value) {
      this.ensureSizeOrGrow(1);
      this.dataView.setUint8(this.bytePosition, Number(value));
      return this.shift(1);
    }
    /**
     * Write a U16 value into a buffer and shift cursor position by 2.
     * @param {Number} value Value to write.
     * @returns {this}
     */
    write16(value) {
      this.ensureSizeOrGrow(2);
      this.dataView.setUint16(this.bytePosition, Number(value), true);
      return this.shift(2);
    }
    /**
     * Write a U32 value into a buffer and shift cursor position by 4.
     * @param {Number} value Value to write.
     * @returns {this}
     */
    write32(value) {
      this.ensureSizeOrGrow(4);
      this.dataView.setUint32(this.bytePosition, Number(value), true);
      return this.shift(4);
    }
    /**
     * Write a U64 value into a buffer and shift cursor position by 8.
     * @param {bigint} value Value to write.
     * @returns {this}
     */
    write64(value) {
      toLittleEndian(BigInt(value), 8).forEach((el) => this.write8(el));
      return this;
    }
    /**
     * Write a U128 value into a buffer and shift cursor position by 16.
     *
     * @param {bigint} value Value to write.
     * @returns {this}
     */
    write128(value) {
      toLittleEndian(BigInt(value), 16).forEach((el) => this.write8(el));
      return this;
    }
    /**
     * Write a U256 value into a buffer and shift cursor position by 16.
     *
     * @param {bigint} value Value to write.
     * @returns {this}
     */
    write256(value) {
      toLittleEndian(BigInt(value), 32).forEach((el) => this.write8(el));
      return this;
    }
    /**
     * Write a ULEB value into a buffer and shift cursor position by number of bytes
     * written.
     * @param {Number} value Value to write.
     * @returns {this}
     */
    writeULEB(value) {
      ulebEncode(value).forEach((el) => this.write8(el));
      return this;
    }
    /**
     * Write a vector into a buffer by first writing the vector length and then calling
     * a callback on each passed value.
     *
     * @param {Array<Any>} vector Array of elements to write.
     * @param {WriteVecCb} cb Callback to call on each element of the vector.
     * @returns {this}
     */
    writeVec(vector, cb) {
      this.writeULEB(vector.length);
      Array.from(vector).forEach((el, i) => cb(this, el, i, vector.length));
      return this;
    }
    /**
     * Adds support for iterations over the object.
     * @returns {Uint8Array}
     */
    *[Symbol.iterator]() {
      for (let i = 0; i < this.bytePosition; i++) {
        yield this.dataView.getUint8(i);
      }
      return this.toBytes();
    }
    /**
     * Get underlying buffer taking only value bytes (in case initial buffer size was bigger).
     * @returns {Uint8Array} Resulting bcs.
     */
    toBytes() {
      return new Uint8Array(this.dataView.buffer.slice(0, this.bytePosition));
    }
    /**
     * Represent data as 'hex' or 'base64'
     * @param encoding Encoding to use: 'base64' or 'hex'
     */
    toString(encoding) {
      return encodeStr(this.toBytes(), encoding);
    }
  };
  function toLittleEndian(bigint2, size) {
    let result = new Uint8Array(size);
    let i = 0;
    while (bigint2 > 0) {
      result[i] = Number(bigint2 % BigInt(256));
      bigint2 = bigint2 / BigInt(256);
      i += 1;
    }
    return result;
  }

  // node_modules/@mysten/bcs/dist/esm/bcs-type.js
  var __typeError3 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck3 = (obj, member, msg) => member.has(obj) || __typeError3("Cannot " + msg);
  var __privateGet3 = (obj, member, getter) => (__accessCheck3(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd3 = (obj, member, value) => member.has(obj) ? __typeError3("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet3 = (obj, member, value, setter) => (__accessCheck3(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var _write;
  var _serialize;
  var _schema;
  var _bytes;
  var _BcsType = class _BcsType2 {
    constructor(options) {
      __privateAdd3(this, _write);
      __privateAdd3(this, _serialize);
      this.name = options.name;
      this.read = options.read;
      this.serializedSize = options.serializedSize ?? (() => null);
      __privateSet3(this, _write, options.write);
      __privateSet3(this, _serialize, options.serialize ?? ((value, options2) => {
        const writer = new BcsWriter({
          initialSize: this.serializedSize(value) ?? void 0,
          ...options2
        });
        __privateGet3(this, _write).call(this, value, writer);
        return writer.toBytes();
      }));
      this.validate = options.validate ?? (() => {
      });
    }
    write(value, writer) {
      this.validate(value);
      __privateGet3(this, _write).call(this, value, writer);
    }
    serialize(value, options) {
      this.validate(value);
      return new SerializedBcs(this, __privateGet3(this, _serialize).call(this, value, options));
    }
    parse(bytes) {
      const reader = new BcsReader(bytes);
      return this.read(reader);
    }
    fromHex(hex) {
      return this.parse(fromHex(hex));
    }
    fromBase58(b64) {
      return this.parse(fromBase58(b64));
    }
    fromBase64(b64) {
      return this.parse(fromBase64(b64));
    }
    transform({
      name,
      input,
      output,
      validate: validate2
    }) {
      return new _BcsType2({
        name: name ?? this.name,
        read: (reader) => output ? output(this.read(reader)) : this.read(reader),
        write: (value, writer) => __privateGet3(this, _write).call(this, input ? input(value) : value, writer),
        serializedSize: (value) => this.serializedSize(input ? input(value) : value),
        serialize: (value, options) => __privateGet3(this, _serialize).call(this, input ? input(value) : value, options),
        validate: (value) => {
          validate2?.(value);
          this.validate(input ? input(value) : value);
        }
      });
    }
  };
  _write = /* @__PURE__ */ new WeakMap();
  _serialize = /* @__PURE__ */ new WeakMap();
  var BcsType = _BcsType;
  var SERIALIZED_BCS_BRAND = Symbol.for("@mysten/serialized-bcs");
  function isSerializedBcs(obj) {
    return !!obj && typeof obj === "object" && obj[SERIALIZED_BCS_BRAND] === true;
  }
  var SerializedBcs = class {
    constructor(type, schema) {
      __privateAdd3(this, _schema);
      __privateAdd3(this, _bytes);
      __privateSet3(this, _schema, type);
      __privateSet3(this, _bytes, schema);
    }
    // Used to brand SerializedBcs so that they can be identified, even between multiple copies
    // of the @mysten/bcs package are installed
    get [SERIALIZED_BCS_BRAND]() {
      return true;
    }
    toBytes() {
      return __privateGet3(this, _bytes);
    }
    toHex() {
      return toHex(__privateGet3(this, _bytes));
    }
    toBase64() {
      return toBase64(__privateGet3(this, _bytes));
    }
    toBase58() {
      return toBase58(__privateGet3(this, _bytes));
    }
    parse() {
      return __privateGet3(this, _schema).parse(__privateGet3(this, _bytes));
    }
  };
  _schema = /* @__PURE__ */ new WeakMap();
  _bytes = /* @__PURE__ */ new WeakMap();
  function fixedSizeBcsType({
    size,
    ...options
  }) {
    return new BcsType({
      ...options,
      serializedSize: () => size
    });
  }
  function uIntBcsType({
    readMethod,
    writeMethod,
    ...options
  }) {
    return fixedSizeBcsType({
      ...options,
      read: (reader) => reader[readMethod](),
      write: (value, writer) => writer[writeMethod](value),
      validate: (value) => {
        if (value < 0 || value > options.maxValue) {
          throw new TypeError(
            `Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`
          );
        }
        options.validate?.(value);
      }
    });
  }
  function bigUIntBcsType({
    readMethod,
    writeMethod,
    ...options
  }) {
    return fixedSizeBcsType({
      ...options,
      read: (reader) => reader[readMethod](),
      write: (value, writer) => writer[writeMethod](BigInt(value)),
      validate: (val) => {
        const value = BigInt(val);
        if (value < 0 || value > options.maxValue) {
          throw new TypeError(
            `Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`
          );
        }
        options.validate?.(value);
      }
    });
  }
  function dynamicSizeBcsType({
    serialize,
    ...options
  }) {
    const type = new BcsType({
      ...options,
      serialize,
      write: (value, writer) => {
        for (const byte of type.serialize(value).toBytes()) {
          writer.write8(byte);
        }
      }
    });
    return type;
  }
  function stringLikeBcsType({
    toBytes: toBytes2,
    fromBytes,
    ...options
  }) {
    return new BcsType({
      ...options,
      read: (reader) => {
        const length = reader.readULEB();
        const bytes = reader.readBytes(length);
        return fromBytes(bytes);
      },
      write: (hex, writer) => {
        const bytes = toBytes2(hex);
        writer.writeULEB(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
          writer.write8(bytes[i]);
        }
      },
      serialize: (value) => {
        const bytes = toBytes2(value);
        const size = ulebEncode(bytes.length);
        const result = new Uint8Array(size.length + bytes.length);
        result.set(size, 0);
        result.set(bytes, size.length);
        return result;
      },
      validate: (value) => {
        if (typeof value !== "string") {
          throw new TypeError(`Invalid ${options.name} value: ${value}. Expected string`);
        }
        options.validate?.(value);
      }
    });
  }
  function lazyBcsType(cb) {
    let lazyType = null;
    function getType() {
      if (!lazyType) {
        lazyType = cb();
      }
      return lazyType;
    }
    return new BcsType({
      name: "lazy",
      read: (data) => getType().read(data),
      serializedSize: (value) => getType().serializedSize(value),
      write: (value, writer) => getType().write(value, writer),
      serialize: (value, options) => getType().serialize(value, options).toBytes()
    });
  }

  // node_modules/@mysten/bcs/dist/esm/bcs.js
  var bcs = {
    /**
     * Creates a BcsType that can be used to read and write an 8-bit unsigned integer.
     * @example
     * bcs.u8().serialize(255).toBytes() // Uint8Array [ 255 ]
     */
    u8(options) {
      return uIntBcsType({
        name: "u8",
        readMethod: "read8",
        writeMethod: "write8",
        size: 1,
        maxValue: 2 ** 8 - 1,
        ...options
      });
    },
    /**
     * Creates a BcsType that can be used to read and write a 16-bit unsigned integer.
     * @example
     * bcs.u16().serialize(65535).toBytes() // Uint8Array [ 255, 255 ]
     */
    u16(options) {
      return uIntBcsType({
        name: "u16",
        readMethod: "read16",
        writeMethod: "write16",
        size: 2,
        maxValue: 2 ** 16 - 1,
        ...options
      });
    },
    /**
     * Creates a BcsType that can be used to read and write a 32-bit unsigned integer.
     * @example
     * bcs.u32().serialize(4294967295).toBytes() // Uint8Array [ 255, 255, 255, 255 ]
     */
    u32(options) {
      return uIntBcsType({
        name: "u32",
        readMethod: "read32",
        writeMethod: "write32",
        size: 4,
        maxValue: 2 ** 32 - 1,
        ...options
      });
    },
    /**
     * Creates a BcsType that can be used to read and write a 64-bit unsigned integer.
     * @example
     * bcs.u64().serialize(1).toBytes() // Uint8Array [ 1, 0, 0, 0, 0, 0, 0, 0 ]
     */
    u64(options) {
      return bigUIntBcsType({
        name: "u64",
        readMethod: "read64",
        writeMethod: "write64",
        size: 8,
        maxValue: 2n ** 64n - 1n,
        ...options
      });
    },
    /**
     * Creates a BcsType that can be used to read and write a 128-bit unsigned integer.
     * @example
     * bcs.u128().serialize(1).toBytes() // Uint8Array [ 1, ..., 0 ]
     */
    u128(options) {
      return bigUIntBcsType({
        name: "u128",
        readMethod: "read128",
        writeMethod: "write128",
        size: 16,
        maxValue: 2n ** 128n - 1n,
        ...options
      });
    },
    /**
     * Creates a BcsType that can be used to read and write a 256-bit unsigned integer.
     * @example
     * bcs.u256().serialize(1).toBytes() // Uint8Array [ 1, ..., 0 ]
     */
    u256(options) {
      return bigUIntBcsType({
        name: "u256",
        readMethod: "read256",
        writeMethod: "write256",
        size: 32,
        maxValue: 2n ** 256n - 1n,
        ...options
      });
    },
    /**
     * Creates a BcsType that can be used to read and write boolean values.
     * @example
     * bcs.bool().serialize(true).toBytes() // Uint8Array [ 1 ]
     */
    bool(options) {
      return fixedSizeBcsType({
        name: "bool",
        size: 1,
        read: (reader) => reader.read8() === 1,
        write: (value, writer) => writer.write8(value ? 1 : 0),
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (typeof value !== "boolean") {
            throw new TypeError(`Expected boolean, found ${typeof value}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType that can be used to read and write unsigned LEB encoded integers
     * @example
     *
     */
    uleb128(options) {
      return dynamicSizeBcsType({
        name: "uleb128",
        read: (reader) => reader.readULEB(),
        serialize: (value) => {
          return Uint8Array.from(ulebEncode(value));
        },
        ...options
      });
    },
    /**
     * Creates a BcsType representing a fixed length byte array
     * @param size The number of bytes this types represents
     * @example
     * bcs.bytes(3).serialize(new Uint8Array([1, 2, 3])).toBytes() // Uint8Array [1, 2, 3]
     */
    bytes(size, options) {
      return fixedSizeBcsType({
        name: `bytes[${size}]`,
        size,
        read: (reader) => reader.readBytes(size),
        write: (value, writer) => {
          const array2 = new Uint8Array(value);
          for (let i = 0; i < size; i++) {
            writer.write8(array2[i] ?? 0);
          }
        },
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (!value || typeof value !== "object" || !("length" in value)) {
            throw new TypeError(`Expected array, found ${typeof value}`);
          }
          if (value.length !== size) {
            throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType that can ser/de string values.  Strings will be UTF-8 encoded
     * @example
     * bcs.string().serialize('a').toBytes() // Uint8Array [ 1, 97 ]
     */
    string(options) {
      return stringLikeBcsType({
        name: "string",
        toBytes: (value) => new TextEncoder().encode(value),
        fromBytes: (bytes) => new TextDecoder().decode(bytes),
        ...options
      });
    },
    /**
     * Creates a BcsType that represents a fixed length array of a given type
     * @param size The number of elements in the array
     * @param type The BcsType of each element in the array
     * @example
     * bcs.fixedArray(3, bcs.u8()).serialize([1, 2, 3]).toBytes() // Uint8Array [ 1, 2, 3 ]
     */
    fixedArray(size, type, options) {
      return new BcsType({
        name: `${type.name}[${size}]`,
        read: (reader) => {
          const result = new Array(size);
          for (let i = 0; i < size; i++) {
            result[i] = type.read(reader);
          }
          return result;
        },
        write: (value, writer) => {
          for (const item of value) {
            type.write(item, writer);
          }
        },
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (!value || typeof value !== "object" || !("length" in value)) {
            throw new TypeError(`Expected array, found ${typeof value}`);
          }
          if (value.length !== size) {
            throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType representing an optional value
     * @param type The BcsType of the optional value
     * @example
     * bcs.option(bcs.u8()).serialize(null).toBytes() // Uint8Array [ 0 ]
     * bcs.option(bcs.u8()).serialize(1).toBytes() // Uint8Array [ 1, 1 ]
     */
    option(type) {
      return bcs.enum(`Option<${type.name}>`, {
        None: null,
        Some: type
      }).transform({
        input: (value) => {
          if (value == null) {
            return { None: true };
          }
          return { Some: value };
        },
        output: (value) => {
          if (value.$kind === "Some") {
            return value.Some;
          }
          return null;
        }
      });
    },
    /**
     * Creates a BcsType representing a variable length vector of a given type
     * @param type The BcsType of each element in the vector
     *
     * @example
     * bcs.vector(bcs.u8()).toBytes([1, 2, 3]) // Uint8Array [ 3, 1, 2, 3 ]
     */
    vector(type, options) {
      return new BcsType({
        name: `vector<${type.name}>`,
        read: (reader) => {
          const length = reader.readULEB();
          const result = new Array(length);
          for (let i = 0; i < length; i++) {
            result[i] = type.read(reader);
          }
          return result;
        },
        write: (value, writer) => {
          writer.writeULEB(value.length);
          for (const item of value) {
            type.write(item, writer);
          }
        },
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (!value || typeof value !== "object" || !("length" in value)) {
            throw new TypeError(`Expected array, found ${typeof value}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType representing a tuple of a given set of types
     * @param types The BcsTypes for each element in the tuple
     *
     * @example
     * const tuple = bcs.tuple([bcs.u8(), bcs.string(), bcs.bool()])
     * tuple.serialize([1, 'a', true]).toBytes() // Uint8Array [ 1, 1, 97, 1 ]
     */
    tuple(types, options) {
      return new BcsType({
        name: `(${types.map((t) => t.name).join(", ")})`,
        serializedSize: (values) => {
          let total = 0;
          for (let i = 0; i < types.length; i++) {
            const size = types[i].serializedSize(values[i]);
            if (size == null) {
              return null;
            }
            total += size;
          }
          return total;
        },
        read: (reader) => {
          const result = [];
          for (const type of types) {
            result.push(type.read(reader));
          }
          return result;
        },
        write: (value, writer) => {
          for (let i = 0; i < types.length; i++) {
            types[i].write(value[i], writer);
          }
        },
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (!Array.isArray(value)) {
            throw new TypeError(`Expected array, found ${typeof value}`);
          }
          if (value.length !== types.length) {
            throw new TypeError(`Expected array of length ${types.length}, found ${value.length}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType representing a struct of a given set of fields
     * @param name The name of the struct
     * @param fields The fields of the struct. The order of the fields affects how data is serialized and deserialized
     *
     * @example
     * const struct = bcs.struct('MyStruct', {
     *  a: bcs.u8(),
     *  b: bcs.string(),
     * })
     * struct.serialize({ a: 1, b: 'a' }).toBytes() // Uint8Array [ 1, 1, 97 ]
     */
    struct(name, fields, options) {
      const canonicalOrder = Object.entries(fields);
      return new BcsType({
        name,
        serializedSize: (values) => {
          let total = 0;
          for (const [field, type] of canonicalOrder) {
            const size = type.serializedSize(values[field]);
            if (size == null) {
              return null;
            }
            total += size;
          }
          return total;
        },
        read: (reader) => {
          const result = {};
          for (const [field, type] of canonicalOrder) {
            result[field] = type.read(reader);
          }
          return result;
        },
        write: (value, writer) => {
          for (const [field, type] of canonicalOrder) {
            type.write(value[field], writer);
          }
        },
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (typeof value !== "object" || value == null) {
            throw new TypeError(`Expected object, found ${typeof value}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType representing an enum of a given set of options
     * @param name The name of the enum
     * @param values The values of the enum. The order of the values affects how data is serialized and deserialized.
     * null can be used to represent a variant with no data.
     *
     * @example
     * const enum = bcs.enum('MyEnum', {
     *   A: bcs.u8(),
     *   B: bcs.string(),
     *   C: null,
     * })
     * enum.serialize({ A: 1 }).toBytes() // Uint8Array [ 0, 1 ]
     * enum.serialize({ B: 'a' }).toBytes() // Uint8Array [ 1, 1, 97 ]
     * enum.serialize({ C: true }).toBytes() // Uint8Array [ 2 ]
     */
    enum(name, values, options) {
      const canonicalOrder = Object.entries(values);
      return new BcsType({
        name,
        read: (reader) => {
          const index = reader.readULEB();
          const enumEntry = canonicalOrder[index];
          if (!enumEntry) {
            throw new TypeError(`Unknown value ${index} for enum ${name}`);
          }
          const [kind, type] = enumEntry;
          return {
            [kind]: type?.read(reader) ?? true,
            $kind: kind
          };
        },
        write: (value, writer) => {
          const [name2, val] = Object.entries(value).filter(
            ([name3]) => Object.hasOwn(values, name3)
          )[0];
          for (let i = 0; i < canonicalOrder.length; i++) {
            const [optionName, optionType] = canonicalOrder[i];
            if (optionName === name2) {
              writer.writeULEB(i);
              optionType?.write(val, writer);
              return;
            }
          }
        },
        ...options,
        validate: (value) => {
          options?.validate?.(value);
          if (typeof value !== "object" || value == null) {
            throw new TypeError(`Expected object, found ${typeof value}`);
          }
          const keys = Object.keys(value).filter(
            (k) => value[k] !== void 0 && Object.hasOwn(values, k)
          );
          if (keys.length !== 1) {
            throw new TypeError(
              `Expected object with one key, but found ${keys.length} for type ${name}}`
            );
          }
          const [variant] = keys;
          if (!Object.hasOwn(values, variant)) {
            throw new TypeError(`Invalid enum variant ${variant}`);
          }
        }
      });
    },
    /**
     * Creates a BcsType representing a map of a given key and value type
     * @param keyType The BcsType of the key
     * @param valueType The BcsType of the value
     * @example
     * const map = bcs.map(bcs.u8(), bcs.string())
     * map.serialize(new Map([[2, 'a']])).toBytes() // Uint8Array [ 1, 2, 1, 97 ]
     */
    map(keyType, valueType) {
      return bcs.vector(bcs.tuple([keyType, valueType])).transform({
        name: `Map<${keyType.name}, ${valueType.name}>`,
        input: (value) => {
          return [...value.entries()];
        },
        output: (value) => {
          const result = /* @__PURE__ */ new Map();
          for (const [key, val] of value) {
            result.set(key, val);
          }
          return result;
        }
      });
    },
    /**
     * Creates a BcsType that wraps another BcsType which is lazily evaluated. This is useful for creating recursive types.
     * @param cb A callback that returns the BcsType
     */
    lazy(cb) {
      return lazyBcsType(cb);
    }
  };

  // node_modules/@mysten/sui/dist/esm/utils/sui-types.js
  var TX_DIGEST_LENGTH = 32;
  function isValidTransactionDigest(value) {
    try {
      const buffer = fromBase58(value);
      return buffer.length === TX_DIGEST_LENGTH;
    } catch (e) {
      return false;
    }
  }
  var SUI_ADDRESS_LENGTH = 32;
  function isValidSuiAddress(value) {
    return isHex(value) && getHexByteLength(value) === SUI_ADDRESS_LENGTH;
  }
  function isValidSuiObjectId(value) {
    return isValidSuiAddress(value);
  }
  function normalizeSuiAddress(value, forceAdd0x = false) {
    let address = value.toLowerCase();
    if (!forceAdd0x && address.startsWith("0x")) {
      address = address.slice(2);
    }
    return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, "0")}`;
  }
  function normalizeSuiObjectId(value, forceAdd0x = false) {
    return normalizeSuiAddress(value, forceAdd0x);
  }
  function isHex(value) {
    return /^(0x|0X)?[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
  }
  function getHexByteLength(value) {
    return /^(0x|0X)/.test(value) ? (value.length - 2) / 2 : value.length / 2;
  }

  // node_modules/@mysten/sui/dist/esm/bcs/type-tag-serializer.js
  var VECTOR_REGEX = /^vector<(.+)>$/;
  var STRUCT_REGEX = /^([^:]+)::([^:]+)::([^<]+)(<(.+)>)?/;
  var TypeTagSerializer = class _TypeTagSerializer {
    static parseFromStr(str, normalizeAddress = false) {
      if (str === "address") {
        return { address: null };
      } else if (str === "bool") {
        return { bool: null };
      } else if (str === "u8") {
        return { u8: null };
      } else if (str === "u16") {
        return { u16: null };
      } else if (str === "u32") {
        return { u32: null };
      } else if (str === "u64") {
        return { u64: null };
      } else if (str === "u128") {
        return { u128: null };
      } else if (str === "u256") {
        return { u256: null };
      } else if (str === "signer") {
        return { signer: null };
      }
      const vectorMatch = str.match(VECTOR_REGEX);
      if (vectorMatch) {
        return {
          vector: _TypeTagSerializer.parseFromStr(vectorMatch[1], normalizeAddress)
        };
      }
      const structMatch = str.match(STRUCT_REGEX);
      if (structMatch) {
        const address = normalizeAddress ? normalizeSuiAddress(structMatch[1]) : structMatch[1];
        return {
          struct: {
            address,
            module: structMatch[2],
            name: structMatch[3],
            typeParams: structMatch[5] === void 0 ? [] : _TypeTagSerializer.parseStructTypeArgs(structMatch[5], normalizeAddress)
          }
        };
      }
      throw new Error(`Encountered unexpected token when parsing type args for ${str}`);
    }
    static parseStructTypeArgs(str, normalizeAddress = false) {
      return splitGenericParameters(str).map(
        (tok) => _TypeTagSerializer.parseFromStr(tok, normalizeAddress)
      );
    }
    static tagToString(tag) {
      if ("bool" in tag) {
        return "bool";
      }
      if ("u8" in tag) {
        return "u8";
      }
      if ("u16" in tag) {
        return "u16";
      }
      if ("u32" in tag) {
        return "u32";
      }
      if ("u64" in tag) {
        return "u64";
      }
      if ("u128" in tag) {
        return "u128";
      }
      if ("u256" in tag) {
        return "u256";
      }
      if ("address" in tag) {
        return "address";
      }
      if ("signer" in tag) {
        return "signer";
      }
      if ("vector" in tag) {
        return `vector<${_TypeTagSerializer.tagToString(tag.vector)}>`;
      }
      if ("struct" in tag) {
        const struct = tag.struct;
        const typeParams = struct.typeParams.map(_TypeTagSerializer.tagToString).join(", ");
        return `${struct.address}::${struct.module}::${struct.name}${typeParams ? `<${typeParams}>` : ""}`;
      }
      throw new Error("Invalid TypeTag");
    }
  };

  // node_modules/@mysten/sui/dist/esm/bcs/bcs.js
  function unsafe_u64(options) {
    return bcs.u64({
      name: "unsafe_u64",
      ...options
    }).transform({
      input: (val) => val,
      output: (val) => Number(val)
    });
  }
  function optionEnum(type) {
    return bcs.enum("Option", {
      None: null,
      Some: type
    });
  }
  var Address = bcs.bytes(SUI_ADDRESS_LENGTH).transform({
    validate: (val) => {
      const address = typeof val === "string" ? val : toHex(val);
      if (!address || !isValidSuiAddress(normalizeSuiAddress(address))) {
        throw new Error(`Invalid Sui address ${address}`);
      }
    },
    input: (val) => typeof val === "string" ? fromHex(normalizeSuiAddress(val)) : val,
    output: (val) => normalizeSuiAddress(toHex(val))
  });
  var ObjectDigest = bcs.vector(bcs.u8()).transform({
    name: "ObjectDigest",
    input: (value) => fromBase58(value),
    output: (value) => toBase58(new Uint8Array(value)),
    validate: (value) => {
      if (fromBase58(value).length !== 32) {
        throw new Error("ObjectDigest must be 32 bytes");
      }
    }
  });
  var SuiObjectRef = bcs.struct("SuiObjectRef", {
    objectId: Address,
    version: bcs.u64(),
    digest: ObjectDigest
  });
  var SharedObjectRef = bcs.struct("SharedObjectRef", {
    objectId: Address,
    initialSharedVersion: bcs.u64(),
    mutable: bcs.bool()
  });
  var ObjectArg = bcs.enum("ObjectArg", {
    ImmOrOwnedObject: SuiObjectRef,
    SharedObject: SharedObjectRef,
    Receiving: SuiObjectRef
  });
  var CallArg = bcs.enum("CallArg", {
    Pure: bcs.struct("Pure", {
      bytes: bcs.vector(bcs.u8()).transform({
        input: (val) => typeof val === "string" ? fromBase64(val) : val,
        output: (val) => toBase64(new Uint8Array(val))
      })
    }),
    Object: ObjectArg
  });
  var InnerTypeTag = bcs.enum("TypeTag", {
    bool: null,
    u8: null,
    u64: null,
    u128: null,
    address: null,
    signer: null,
    vector: bcs.lazy(() => InnerTypeTag),
    struct: bcs.lazy(() => StructTag),
    u16: null,
    u32: null,
    u256: null
  });
  var TypeTag = InnerTypeTag.transform({
    input: (typeTag) => typeof typeTag === "string" ? TypeTagSerializer.parseFromStr(typeTag, true) : typeTag,
    output: (typeTag) => TypeTagSerializer.tagToString(typeTag)
  });
  var Argument = bcs.enum("Argument", {
    GasCoin: null,
    Input: bcs.u16(),
    Result: bcs.u16(),
    NestedResult: bcs.tuple([bcs.u16(), bcs.u16()])
  });
  var ProgrammableMoveCall = bcs.struct("ProgrammableMoveCall", {
    package: Address,
    module: bcs.string(),
    function: bcs.string(),
    typeArguments: bcs.vector(TypeTag),
    arguments: bcs.vector(Argument)
  });
  var Command = bcs.enum("Command", {
    /**
     * A Move Call - any public Move function can be called via
     * this transaction. The results can be used that instant to pass
     * into the next transaction.
     */
    MoveCall: ProgrammableMoveCall,
    /**
     * Transfer vector of objects to a receiver.
     */
    TransferObjects: bcs.struct("TransferObjects", {
      objects: bcs.vector(Argument),
      address: Argument
    }),
    // /**
    //  * Split `amount` from a `coin`.
    //  */
    SplitCoins: bcs.struct("SplitCoins", {
      coin: Argument,
      amounts: bcs.vector(Argument)
    }),
    // /**
    //  * Merge Vector of Coins (`sources`) into a `destination`.
    //  */
    MergeCoins: bcs.struct("MergeCoins", {
      destination: Argument,
      sources: bcs.vector(Argument)
    }),
    // /**
    //  * Publish a Move module.
    //  */
    Publish: bcs.struct("Publish", {
      modules: bcs.vector(
        bcs.vector(bcs.u8()).transform({
          input: (val) => typeof val === "string" ? fromBase64(val) : val,
          output: (val) => toBase64(new Uint8Array(val))
        })
      ),
      dependencies: bcs.vector(Address)
    }),
    // /**
    //  * Build a vector of objects using the input arguments.
    //  * It is impossible to export construct a `vector<T: key>` otherwise,
    //  * so this call serves a utility function.
    //  */
    MakeMoveVec: bcs.struct("MakeMoveVec", {
      type: optionEnum(TypeTag).transform({
        input: (val) => val === null ? {
          None: true
        } : {
          Some: val
        },
        output: (val) => val.Some ?? null
      }),
      elements: bcs.vector(Argument)
    }),
    Upgrade: bcs.struct("Upgrade", {
      modules: bcs.vector(
        bcs.vector(bcs.u8()).transform({
          input: (val) => typeof val === "string" ? fromBase64(val) : val,
          output: (val) => toBase64(new Uint8Array(val))
        })
      ),
      dependencies: bcs.vector(Address),
      package: Address,
      ticket: Argument
    })
  });
  var ProgrammableTransaction = bcs.struct("ProgrammableTransaction", {
    inputs: bcs.vector(CallArg),
    commands: bcs.vector(Command)
  });
  var TransactionKind = bcs.enum("TransactionKind", {
    ProgrammableTransaction,
    ChangeEpoch: null,
    Genesis: null,
    ConsensusCommitPrologue: null
  });
  var TransactionExpiration = bcs.enum("TransactionExpiration", {
    None: null,
    Epoch: unsafe_u64()
  });
  var StructTag = bcs.struct("StructTag", {
    address: Address,
    module: bcs.string(),
    name: bcs.string(),
    typeParams: bcs.vector(InnerTypeTag)
  });
  var GasData = bcs.struct("GasData", {
    payment: bcs.vector(SuiObjectRef),
    owner: Address,
    price: bcs.u64(),
    budget: bcs.u64()
  });
  var TransactionDataV1 = bcs.struct("TransactionDataV1", {
    kind: TransactionKind,
    sender: Address,
    gasData: GasData,
    expiration: TransactionExpiration
  });
  var TransactionData = bcs.enum("TransactionData", {
    V1: TransactionDataV1
  });
  var IntentScope = bcs.enum("IntentScope", {
    TransactionData: null,
    TransactionEffects: null,
    CheckpointSummary: null,
    PersonalMessage: null
  });
  var IntentVersion = bcs.enum("IntentVersion", {
    V0: null
  });
  var AppId = bcs.enum("AppId", {
    Sui: null
  });
  var Intent = bcs.struct("Intent", {
    scope: IntentScope,
    version: IntentVersion,
    appId: AppId
  });
  function IntentMessage(T) {
    return bcs.struct(`IntentMessage<${T.name}>`, {
      intent: Intent,
      value: T
    });
  }
  var CompressedSignature = bcs.enum("CompressedSignature", {
    ED25519: bcs.fixedArray(64, bcs.u8()),
    Secp256k1: bcs.fixedArray(64, bcs.u8()),
    Secp256r1: bcs.fixedArray(64, bcs.u8()),
    ZkLogin: bcs.vector(bcs.u8())
  });
  var PublicKey = bcs.enum("PublicKey", {
    ED25519: bcs.fixedArray(32, bcs.u8()),
    Secp256k1: bcs.fixedArray(33, bcs.u8()),
    Secp256r1: bcs.fixedArray(33, bcs.u8()),
    ZkLogin: bcs.vector(bcs.u8())
  });
  var MultiSigPkMap = bcs.struct("MultiSigPkMap", {
    pubKey: PublicKey,
    weight: bcs.u8()
  });
  var MultiSigPublicKey = bcs.struct("MultiSigPublicKey", {
    pk_map: bcs.vector(MultiSigPkMap),
    threshold: bcs.u16()
  });
  var MultiSig = bcs.struct("MultiSig", {
    sigs: bcs.vector(CompressedSignature),
    bitmap: bcs.u16(),
    multisig_pk: MultiSigPublicKey
  });
  var base64String = bcs.vector(bcs.u8()).transform({
    input: (val) => typeof val === "string" ? fromBase64(val) : val,
    output: (val) => toBase64(new Uint8Array(val))
  });
  var SenderSignedTransaction = bcs.struct("SenderSignedTransaction", {
    intentMessage: IntentMessage(TransactionData),
    txSignatures: bcs.vector(base64String)
  });
  var SenderSignedData = bcs.vector(SenderSignedTransaction, {
    name: "SenderSignedData"
  });
  var PasskeyAuthenticator = bcs.struct("PasskeyAuthenticator", {
    authenticatorData: bcs.vector(bcs.u8()),
    clientDataJson: bcs.string(),
    userSignature: bcs.vector(bcs.u8())
  });

  // node_modules/@mysten/sui/dist/esm/bcs/effects.js
  var PackageUpgradeError = bcs.enum("PackageUpgradeError", {
    UnableToFetchPackage: bcs.struct("UnableToFetchPackage", { packageId: Address }),
    NotAPackage: bcs.struct("NotAPackage", { objectId: Address }),
    IncompatibleUpgrade: null,
    DigestDoesNotMatch: bcs.struct("DigestDoesNotMatch", { digest: bcs.vector(bcs.u8()) }),
    UnknownUpgradePolicy: bcs.struct("UnknownUpgradePolicy", { policy: bcs.u8() }),
    PackageIDDoesNotMatch: bcs.struct("PackageIDDoesNotMatch", {
      packageId: Address,
      ticketId: Address
    })
  });
  var ModuleId = bcs.struct("ModuleId", {
    address: Address,
    name: bcs.string()
  });
  var MoveLocation = bcs.struct("MoveLocation", {
    module: ModuleId,
    function: bcs.u16(),
    instruction: bcs.u16(),
    functionName: bcs.option(bcs.string())
  });
  var CommandArgumentError = bcs.enum("CommandArgumentError", {
    TypeMismatch: null,
    InvalidBCSBytes: null,
    InvalidUsageOfPureArg: null,
    InvalidArgumentToPrivateEntryFunction: null,
    IndexOutOfBounds: bcs.struct("IndexOutOfBounds", { idx: bcs.u16() }),
    SecondaryIndexOutOfBounds: bcs.struct("SecondaryIndexOutOfBounds", {
      resultIdx: bcs.u16(),
      secondaryIdx: bcs.u16()
    }),
    InvalidResultArity: bcs.struct("InvalidResultArity", { resultIdx: bcs.u16() }),
    InvalidGasCoinUsage: null,
    InvalidValueUsage: null,
    InvalidObjectByValue: null,
    InvalidObjectByMutRef: null,
    SharedObjectOperationNotAllowed: null
  });
  var TypeArgumentError = bcs.enum("TypeArgumentError", {
    TypeNotFound: null,
    ConstraintNotSatisfied: null
  });
  var ExecutionFailureStatus = bcs.enum("ExecutionFailureStatus", {
    InsufficientGas: null,
    InvalidGasObject: null,
    InvariantViolation: null,
    FeatureNotYetSupported: null,
    MoveObjectTooBig: bcs.struct("MoveObjectTooBig", {
      objectSize: bcs.u64(),
      maxObjectSize: bcs.u64()
    }),
    MovePackageTooBig: bcs.struct("MovePackageTooBig", {
      objectSize: bcs.u64(),
      maxObjectSize: bcs.u64()
    }),
    CircularObjectOwnership: bcs.struct("CircularObjectOwnership", { object: Address }),
    InsufficientCoinBalance: null,
    CoinBalanceOverflow: null,
    PublishErrorNonZeroAddress: null,
    SuiMoveVerificationError: null,
    MovePrimitiveRuntimeError: bcs.option(MoveLocation),
    MoveAbort: bcs.tuple([MoveLocation, bcs.u64()]),
    VMVerificationOrDeserializationError: null,
    VMInvariantViolation: null,
    FunctionNotFound: null,
    ArityMismatch: null,
    TypeArityMismatch: null,
    NonEntryFunctionInvoked: null,
    CommandArgumentError: bcs.struct("CommandArgumentError", {
      argIdx: bcs.u16(),
      kind: CommandArgumentError
    }),
    TypeArgumentError: bcs.struct("TypeArgumentError", {
      argumentIdx: bcs.u16(),
      kind: TypeArgumentError
    }),
    UnusedValueWithoutDrop: bcs.struct("UnusedValueWithoutDrop", {
      resultIdx: bcs.u16(),
      secondaryIdx: bcs.u16()
    }),
    InvalidPublicFunctionReturnType: bcs.struct("InvalidPublicFunctionReturnType", {
      idx: bcs.u16()
    }),
    InvalidTransferObject: null,
    EffectsTooLarge: bcs.struct("EffectsTooLarge", { currentSize: bcs.u64(), maxSize: bcs.u64() }),
    PublishUpgradeMissingDependency: null,
    PublishUpgradeDependencyDowngrade: null,
    PackageUpgradeError: bcs.struct("PackageUpgradeError", { upgradeError: PackageUpgradeError }),
    WrittenObjectsTooLarge: bcs.struct("WrittenObjectsTooLarge", {
      currentSize: bcs.u64(),
      maxSize: bcs.u64()
    }),
    CertificateDenied: null,
    SuiMoveVerificationTimedout: null,
    SharedObjectOperationNotAllowed: null,
    InputObjectDeleted: null,
    ExecutionCancelledDueToSharedObjectCongestion: bcs.struct(
      "ExecutionCancelledDueToSharedObjectCongestion",
      {
        congestedObjects: bcs.vector(Address)
      }
    ),
    AddressDeniedForCoin: bcs.struct("AddressDeniedForCoin", {
      address: Address,
      coinType: bcs.string()
    }),
    CoinTypeGlobalPause: bcs.struct("CoinTypeGlobalPause", { coinType: bcs.string() }),
    ExecutionCancelledDueToRandomnessUnavailable: null
  });
  var ExecutionStatus = bcs.enum("ExecutionStatus", {
    Success: null,
    Failed: bcs.struct("ExecutionFailed", {
      error: ExecutionFailureStatus,
      command: bcs.option(bcs.u64())
    })
  });
  var GasCostSummary = bcs.struct("GasCostSummary", {
    computationCost: bcs.u64(),
    storageCost: bcs.u64(),
    storageRebate: bcs.u64(),
    nonRefundableStorageFee: bcs.u64()
  });
  var Owner = bcs.enum("Owner", {
    AddressOwner: Address,
    ObjectOwner: Address,
    Shared: bcs.struct("Shared", {
      initialSharedVersion: bcs.u64()
    }),
    Immutable: null
  });
  var TransactionEffectsV1 = bcs.struct("TransactionEffectsV1", {
    status: ExecutionStatus,
    executedEpoch: bcs.u64(),
    gasUsed: GasCostSummary,
    modifiedAtVersions: bcs.vector(bcs.tuple([Address, bcs.u64()])),
    sharedObjects: bcs.vector(SuiObjectRef),
    transactionDigest: ObjectDigest,
    created: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
    mutated: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
    unwrapped: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
    deleted: bcs.vector(SuiObjectRef),
    unwrappedThenDeleted: bcs.vector(SuiObjectRef),
    wrapped: bcs.vector(SuiObjectRef),
    gasObject: bcs.tuple([SuiObjectRef, Owner]),
    eventsDigest: bcs.option(ObjectDigest),
    dependencies: bcs.vector(ObjectDigest)
  });
  var VersionDigest = bcs.tuple([bcs.u64(), ObjectDigest]);
  var ObjectIn = bcs.enum("ObjectIn", {
    NotExist: null,
    Exist: bcs.tuple([VersionDigest, Owner])
  });
  var ObjectOut = bcs.enum("ObjectOut", {
    NotExist: null,
    ObjectWrite: bcs.tuple([ObjectDigest, Owner]),
    PackageWrite: VersionDigest
  });
  var IDOperation = bcs.enum("IDOperation", {
    None: null,
    Created: null,
    Deleted: null
  });
  var EffectsObjectChange = bcs.struct("EffectsObjectChange", {
    inputState: ObjectIn,
    outputState: ObjectOut,
    idOperation: IDOperation
  });
  var UnchangedSharedKind = bcs.enum("UnchangedSharedKind", {
    ReadOnlyRoot: VersionDigest,
    MutateDeleted: bcs.u64(),
    ReadDeleted: bcs.u64(),
    Cancelled: bcs.u64(),
    PerEpochConfig: null
  });
  var TransactionEffectsV2 = bcs.struct("TransactionEffectsV2", {
    status: ExecutionStatus,
    executedEpoch: bcs.u64(),
    gasUsed: GasCostSummary,
    transactionDigest: ObjectDigest,
    gasObjectIndex: bcs.option(bcs.u32()),
    eventsDigest: bcs.option(ObjectDigest),
    dependencies: bcs.vector(ObjectDigest),
    lamportVersion: bcs.u64(),
    changedObjects: bcs.vector(bcs.tuple([Address, EffectsObjectChange])),
    unchangedSharedObjects: bcs.vector(bcs.tuple([Address, UnchangedSharedKind])),
    auxDataDigest: bcs.option(ObjectDigest)
  });
  var TransactionEffects = bcs.enum("TransactionEffects", {
    V1: TransactionEffectsV1,
    V2: TransactionEffectsV2
  });

  // node_modules/@mysten/sui/dist/esm/bcs/pure.js
  function pureBcsSchemaFromTypeName(name) {
    switch (name) {
      case "u8":
        return bcs.u8();
      case "u16":
        return bcs.u16();
      case "u32":
        return bcs.u32();
      case "u64":
        return bcs.u64();
      case "u128":
        return bcs.u128();
      case "u256":
        return bcs.u256();
      case "bool":
        return bcs.bool();
      case "string":
        return bcs.string();
      case "id":
      case "address":
        return Address;
    }
    const generic = name.match(/^(vector|option)<(.+)>$/);
    if (generic) {
      const [kind, inner] = generic.slice(1);
      if (kind === "vector") {
        return bcs.vector(pureBcsSchemaFromTypeName(inner));
      } else {
        return bcs.option(pureBcsSchemaFromTypeName(inner));
      }
    }
    throw new Error(`Invalid Pure type name: ${name}`);
  }

  // node_modules/@mysten/sui/dist/esm/bcs/index.js
  var suiBcs = {
    ...bcs,
    U8: bcs.u8(),
    U16: bcs.u16(),
    U32: bcs.u32(),
    U64: bcs.u64(),
    U128: bcs.u128(),
    U256: bcs.u256(),
    ULEB128: bcs.uleb128(),
    Bool: bcs.bool(),
    String: bcs.string(),
    Address,
    AppId,
    Argument,
    CallArg,
    CompressedSignature,
    GasData,
    Intent,
    IntentMessage,
    IntentScope,
    IntentVersion,
    MultiSig,
    MultiSigPkMap,
    MultiSigPublicKey,
    ObjectArg,
    ObjectDigest,
    ProgrammableMoveCall,
    ProgrammableTransaction,
    PublicKey,
    SenderSignedData,
    SenderSignedTransaction,
    SharedObjectRef,
    StructTag,
    SuiObjectRef,
    Command,
    TransactionData,
    TransactionDataV1,
    TransactionExpiration,
    TransactionKind,
    TypeTag,
    TransactionEffects,
    PasskeyAuthenticator
  };

  // node_modules/@mysten/sui/dist/esm/utils/suins.js
  var SUI_NS_NAME_REGEX = /^(?!.*(^(?!@)|[-.@])($|[-.@]))(?:[a-z0-9-]{0,63}(?:\.[a-z0-9-]{0,63})*)?@[a-z0-9-]{0,63}$/i;
  var SUI_NS_DOMAIN_REGEX = /^(?!.*(^|[-.])($|[-.]))(?:[a-z0-9-]{0,63}\.)+sui$/i;
  function normalizeSuiNSName(name, format = "at") {
    const lowerCase = name.toLowerCase();
    let parts;
    if (lowerCase.includes("@")) {
      if (!SUI_NS_NAME_REGEX.test(lowerCase)) {
        throw new Error(`Invalid SuiNS name ${name}`);
      }
      const [labels, domain] = lowerCase.split("@");
      parts = [...labels ? labels.split(".") : [], domain];
    } else {
      if (!SUI_NS_DOMAIN_REGEX.test(lowerCase)) {
        throw new Error(`Invalid SuiNS name ${name}`);
      }
      parts = lowerCase.split(".").slice(0, -1);
    }
    if (format === "dot") {
      return `${parts.join(".")}.sui`;
    }
    return `${parts.slice(0, -1).join(".")}@${parts[parts.length - 1]}`;
  }

  // node_modules/@mysten/sui/dist/esm/utils/constants.js
  var MIST_PER_SUI = BigInt(1e9);
  var MOVE_STDLIB_ADDRESS = "0x1";
  var SUI_FRAMEWORK_ADDRESS = "0x2";
  var SUI_CLOCK_OBJECT_ID = normalizeSuiObjectId("0x6");
  var SUI_TYPE_ARG = `${SUI_FRAMEWORK_ADDRESS}::sui::SUI`;
  var SUI_SYSTEM_STATE_OBJECT_ID = normalizeSuiObjectId("0x5");

  // node_modules/@noble/hashes/esm/crypto.js
  var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

  // node_modules/@noble/hashes/esm/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function anumber(n) {
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error("positive integer expected, got " + n);
  }
  function abytes(b, ...lengths) {
    if (!isBytes(b))
      throw new Error("Uint8Array expected");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
  }
  function ahash(h) {
    if (typeof h !== "function" || typeof h.create !== "function")
      throw new Error("Hash should be wrapped by utils.createHasher");
    anumber(h.outputLen);
    anumber(h.blockLen);
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance) {
    abytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error("digestInto() expects output buffer of length at least " + min);
    }
  }
  function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function byteSwap(word) {
    return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
  }
  var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n);
  function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = byteSwap(arr[i]);
    }
    return arr;
  }
  var swap32IfBE = isLE ? (u) => u : byteSwap32;
  var hasHexBuiltin = /* @__PURE__ */ (() => (
    // @ts-ignore
    typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
  ))();
  var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  function bytesToHex(bytes) {
    abytes(bytes);
    if (hasHexBuiltin)
      return bytes.toHex();
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
  }
  var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
  function asciiToBase16(ch) {
    if (ch >= asciis._0 && ch <= asciis._9)
      return ch - asciis._0;
    if (ch >= asciis.A && ch <= asciis.F)
      return ch - (asciis.A - 10);
    if (ch >= asciis.a && ch <= asciis.f)
      return ch - (asciis.a - 10);
    return;
  }
  function hexToBytes(hex) {
    if (typeof hex !== "string")
      throw new Error("hex string expected, got " + typeof hex);
    if (hasHexBuiltin)
      return Uint8Array.fromHex(hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
      throw new Error("hex string expected, got unpadded hex of length " + hl);
    const array2 = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
      const n1 = asciiToBase16(hex.charCodeAt(hi));
      const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
      if (n1 === void 0 || n2 === void 0) {
        const char = hex[hi] + hex[hi + 1];
        throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
      }
      array2[ai] = n1 * 16 + n2;
    }
    return array2;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new Error("string expected");
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    abytes(data);
    return data;
  }
  function kdfInputToBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    abytes(data);
    return data;
  }
  function concatBytes(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      abytes(a);
      sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
      const a = arrays[i];
      res.set(a, pad);
      pad += a.length;
    }
    return res;
  }
  function checkOpts(defaults, opts) {
    if (opts !== void 0 && {}.toString.call(opts) !== "[object Object]")
      throw new Error("options should be object or undefined");
    const merged = Object.assign(defaults, opts);
    return merged;
  }
  var Hash = class {
  };
  function createHasher(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }
  function createOptHasher(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
  }
  function randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === "function") {
      return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    if (crypto && typeof crypto.randomBytes === "function") {
      return Uint8Array.from(crypto.randomBytes(bytesLength));
    }
    throw new Error("crypto.getRandomValues must be defined");
  }

  // node_modules/@noble/hashes/esm/_blake.js
  var BSIGMA = /* @__PURE__ */ Uint8Array.from([
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9,
    12,
    5,
    1,
    15,
    14,
    13,
    4,
    10,
    0,
    7,
    6,
    3,
    9,
    2,
    8,
    11,
    13,
    11,
    7,
    14,
    12,
    1,
    3,
    9,
    5,
    0,
    15,
    4,
    8,
    6,
    2,
    10,
    6,
    15,
    14,
    9,
    11,
    3,
    0,
    8,
    12,
    2,
    13,
    7,
    1,
    4,
    10,
    5,
    10,
    2,
    8,
    4,
    7,
    6,
    1,
    5,
    15,
    11,
    9,
    14,
    3,
    12,
    13,
    0,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    // Blake1, unused in others
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9
  ]);

  // node_modules/@noble/hashes/esm/_md.js
  function setBigUint64(view, byteOffset, value, isLE2) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value, isLE2);
    const _32n2 = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value >> _32n2 & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE2 ? 4 : 0;
    const l = isLE2 ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE2);
    view.setUint32(byteOffset + l, wl, isLE2);
  }
  var HashMD = class extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE2) {
      super();
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE2;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists(this);
      data = toBytes(data);
      abytes(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE2 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos; i < blockLen; i++)
        buffer[i] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE2);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor());
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    4089235720,
    3144134277,
    2227873595,
    1013904242,
    4271175723,
    2773480762,
    1595750129,
    1359893119,
    2917565137,
    2600822924,
    725511199,
    528734635,
    4215389547,
    1541459225,
    327033209
  ]);

  // node_modules/@noble/hashes/esm/_u64.js
  var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
  var _32n = /* @__PURE__ */ BigInt(32);
  function fromBig(n, le = false) {
    if (le)
      return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
    return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
  }
  function split(lst, le = false) {
    const len = lst.length;
    let Ah = new Uint32Array(len);
    let Al = new Uint32Array(len);
    for (let i = 0; i < len; i++) {
      const { h, l } = fromBig(lst[i], le);
      [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
  }
  var shrSH = (h, _l, s) => h >>> s;
  var shrSL = (h, l, s) => h << 32 - s | l >>> s;
  var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
  var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
  var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
  var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
  var rotr32H = (_h, l) => l;
  var rotr32L = (h, _l) => h;
  function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
  }
  var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
  var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
  var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
  var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
  var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
  var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

  // node_modules/@noble/hashes/esm/blake2.js
  var B2B_IV = /* @__PURE__ */ Uint32Array.from([
    4089235720,
    1779033703,
    2227873595,
    3144134277,
    4271175723,
    1013904242,
    1595750129,
    2773480762,
    2917565137,
    1359893119,
    725511199,
    2600822924,
    4215389547,
    528734635,
    327033209,
    1541459225
  ]);
  var BBUF = /* @__PURE__ */ new Uint32Array(32);
  function G1b(a, b, c, d, msg, x) {
    const Xl = msg[x], Xh = msg[x + 1];
    let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
    let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
    let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
    let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
    let ll = add3L(Al, Bl, Xl);
    Ah = add3H(ll, Ah, Bh, Xh);
    Al = ll | 0;
    ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
    ({ Dh, Dl } = { Dh: rotr32H(Dh, Dl), Dl: rotr32L(Dh, Dl) });
    ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
    ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
    ({ Bh, Bl } = { Bh: rotrSH(Bh, Bl, 24), Bl: rotrSL(Bh, Bl, 24) });
    BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
    BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
    BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
    BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
  }
  function G2b(a, b, c, d, msg, x) {
    const Xl = msg[x], Xh = msg[x + 1];
    let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
    let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
    let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
    let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
    let ll = add3L(Al, Bl, Xl);
    Ah = add3H(ll, Ah, Bh, Xh);
    Al = ll | 0;
    ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
    ({ Dh, Dl } = { Dh: rotrSH(Dh, Dl, 16), Dl: rotrSL(Dh, Dl, 16) });
    ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
    ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
    ({ Bh, Bl } = { Bh: rotrBH(Bh, Bl, 63), Bl: rotrBL(Bh, Bl, 63) });
    BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
    BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
    BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
    BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
  }
  function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
    anumber(keyLen);
    if (outputLen < 0 || outputLen > keyLen)
      throw new Error("outputLen bigger than keyLen");
    const { key, salt, personalization } = opts;
    if (key !== void 0 && (key.length < 1 || key.length > keyLen))
      throw new Error("key length must be undefined or 1.." + keyLen);
    if (salt !== void 0 && salt.length !== saltLen)
      throw new Error("salt must be undefined or " + saltLen);
    if (personalization !== void 0 && personalization.length !== persLen)
      throw new Error("personalization must be undefined or " + persLen);
  }
  var BLAKE2 = class extends Hash {
    constructor(blockLen, outputLen) {
      super();
      this.finished = false;
      this.destroyed = false;
      this.length = 0;
      this.pos = 0;
      anumber(blockLen);
      anumber(outputLen);
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.buffer = new Uint8Array(blockLen);
      this.buffer32 = u32(this.buffer);
    }
    update(data) {
      aexists(this);
      data = toBytes(data);
      abytes(data);
      const { blockLen, buffer, buffer32 } = this;
      const len = data.length;
      const offset = data.byteOffset;
      const buf = data.buffer;
      for (let pos = 0; pos < len; ) {
        if (this.pos === blockLen) {
          swap32IfBE(buffer32);
          this.compress(buffer32, 0, false);
          swap32IfBE(buffer32);
          this.pos = 0;
        }
        const take = Math.min(blockLen - this.pos, len - pos);
        const dataOffset = offset + pos;
        if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
          const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
          swap32IfBE(data32);
          for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
            this.length += blockLen;
            this.compress(data32, pos32, false);
          }
          swap32IfBE(data32);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        this.length += take;
        pos += take;
      }
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      const { pos, buffer32 } = this;
      this.finished = true;
      clean(this.buffer.subarray(pos));
      swap32IfBE(buffer32);
      this.compress(buffer32, 0, true);
      swap32IfBE(buffer32);
      const out32 = u32(out);
      this.get().forEach((v, i) => out32[i] = swap8IfBE(v));
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      const { buffer, length, finished, destroyed, outputLen, pos } = this;
      to || (to = new this.constructor({ dkLen: outputLen }));
      to.set(...this.get());
      to.buffer.set(buffer);
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      to.outputLen = outputLen;
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var BLAKE2b = class extends BLAKE2 {
    constructor(opts = {}) {
      const olen = opts.dkLen === void 0 ? 64 : opts.dkLen;
      super(128, olen);
      this.v0l = B2B_IV[0] | 0;
      this.v0h = B2B_IV[1] | 0;
      this.v1l = B2B_IV[2] | 0;
      this.v1h = B2B_IV[3] | 0;
      this.v2l = B2B_IV[4] | 0;
      this.v2h = B2B_IV[5] | 0;
      this.v3l = B2B_IV[6] | 0;
      this.v3h = B2B_IV[7] | 0;
      this.v4l = B2B_IV[8] | 0;
      this.v4h = B2B_IV[9] | 0;
      this.v5l = B2B_IV[10] | 0;
      this.v5h = B2B_IV[11] | 0;
      this.v6l = B2B_IV[12] | 0;
      this.v6h = B2B_IV[13] | 0;
      this.v7l = B2B_IV[14] | 0;
      this.v7h = B2B_IV[15] | 0;
      checkBlake2Opts(olen, opts, 64, 16, 16);
      let { key, personalization, salt } = opts;
      let keyLength = 0;
      if (key !== void 0) {
        key = toBytes(key);
        keyLength = key.length;
      }
      this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
      if (salt !== void 0) {
        salt = toBytes(salt);
        const slt = u32(salt);
        this.v4l ^= swap8IfBE(slt[0]);
        this.v4h ^= swap8IfBE(slt[1]);
        this.v5l ^= swap8IfBE(slt[2]);
        this.v5h ^= swap8IfBE(slt[3]);
      }
      if (personalization !== void 0) {
        personalization = toBytes(personalization);
        const pers = u32(personalization);
        this.v6l ^= swap8IfBE(pers[0]);
        this.v6h ^= swap8IfBE(pers[1]);
        this.v7l ^= swap8IfBE(pers[2]);
        this.v7h ^= swap8IfBE(pers[3]);
      }
      if (key !== void 0) {
        const tmp = new Uint8Array(this.blockLen);
        tmp.set(key);
        this.update(tmp);
      }
    }
    // prettier-ignore
    get() {
      let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
      return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
    }
    // prettier-ignore
    set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
      this.v0l = v0l | 0;
      this.v0h = v0h | 0;
      this.v1l = v1l | 0;
      this.v1h = v1h | 0;
      this.v2l = v2l | 0;
      this.v2h = v2h | 0;
      this.v3l = v3l | 0;
      this.v3h = v3h | 0;
      this.v4l = v4l | 0;
      this.v4h = v4h | 0;
      this.v5l = v5l | 0;
      this.v5h = v5h | 0;
      this.v6l = v6l | 0;
      this.v6h = v6h | 0;
      this.v7l = v7l | 0;
      this.v7h = v7h | 0;
    }
    compress(msg, offset, isLast) {
      this.get().forEach((v, i) => BBUF[i] = v);
      BBUF.set(B2B_IV, 16);
      let { h, l } = fromBig(BigInt(this.length));
      BBUF[24] = B2B_IV[8] ^ l;
      BBUF[25] = B2B_IV[9] ^ h;
      if (isLast) {
        BBUF[28] = ~BBUF[28];
        BBUF[29] = ~BBUF[29];
      }
      let j = 0;
      const s = BSIGMA;
      for (let i = 0; i < 12; i++) {
        G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
        G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
        G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
        G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
        G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
        G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
        G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
        G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
        G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
        G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
        G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
        G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
        G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
        G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
        G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
        G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      }
      this.v0l ^= BBUF[0] ^ BBUF[16];
      this.v0h ^= BBUF[1] ^ BBUF[17];
      this.v1l ^= BBUF[2] ^ BBUF[18];
      this.v1h ^= BBUF[3] ^ BBUF[19];
      this.v2l ^= BBUF[4] ^ BBUF[20];
      this.v2h ^= BBUF[5] ^ BBUF[21];
      this.v3l ^= BBUF[6] ^ BBUF[22];
      this.v3h ^= BBUF[7] ^ BBUF[23];
      this.v4l ^= BBUF[8] ^ BBUF[24];
      this.v4h ^= BBUF[9] ^ BBUF[25];
      this.v5l ^= BBUF[10] ^ BBUF[26];
      this.v5h ^= BBUF[11] ^ BBUF[27];
      this.v6l ^= BBUF[12] ^ BBUF[28];
      this.v6h ^= BBUF[13] ^ BBUF[29];
      this.v7l ^= BBUF[14] ^ BBUF[30];
      this.v7h ^= BBUF[15] ^ BBUF[31];
      clean(BBUF);
    }
    destroy() {
      this.destroyed = true;
      clean(this.buffer32);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  };
  var blake2b = /* @__PURE__ */ createOptHasher((opts) => new BLAKE2b(opts));

  // node_modules/@noble/hashes/esm/blake2b.js
  var blake2b2 = blake2b;

  // node_modules/@mysten/sui/dist/esm/transactions/serializer.js
  var OBJECT_MODULE_NAME = "object";
  var ID_STRUCT_NAME = "ID";
  var STD_ASCII_MODULE_NAME = "ascii";
  var STD_ASCII_STRUCT_NAME = "String";
  var STD_UTF8_MODULE_NAME = "string";
  var STD_UTF8_STRUCT_NAME = "String";
  var STD_OPTION_MODULE_NAME = "option";
  var STD_OPTION_STRUCT_NAME = "Option";
  function isTxContext(param) {
    const struct = typeof param.body === "object" && "datatype" in param.body ? param.body.datatype : null;
    return !!struct && normalizeSuiAddress(struct.package) === normalizeSuiAddress("0x2") && struct.module === "tx_context" && struct.type === "TxContext";
  }
  function getPureBcsSchema(typeSignature) {
    if (typeof typeSignature === "string") {
      switch (typeSignature) {
        case "address":
          return suiBcs.Address;
        case "bool":
          return suiBcs.Bool;
        case "u8":
          return suiBcs.U8;
        case "u16":
          return suiBcs.U16;
        case "u32":
          return suiBcs.U32;
        case "u64":
          return suiBcs.U64;
        case "u128":
          return suiBcs.U128;
        case "u256":
          return suiBcs.U256;
        default:
          throw new Error(`Unknown type signature ${typeSignature}`);
      }
    }
    if ("vector" in typeSignature) {
      if (typeSignature.vector === "u8") {
        return suiBcs.vector(suiBcs.U8).transform({
          input: (val) => typeof val === "string" ? new TextEncoder().encode(val) : val,
          output: (val) => val
        });
      }
      const type = getPureBcsSchema(typeSignature.vector);
      return type ? suiBcs.vector(type) : null;
    }
    if ("datatype" in typeSignature) {
      const pkg = normalizeSuiAddress(typeSignature.datatype.package);
      if (pkg === normalizeSuiAddress(MOVE_STDLIB_ADDRESS)) {
        if (typeSignature.datatype.module === STD_ASCII_MODULE_NAME && typeSignature.datatype.type === STD_ASCII_STRUCT_NAME) {
          return suiBcs.String;
        }
        if (typeSignature.datatype.module === STD_UTF8_MODULE_NAME && typeSignature.datatype.type === STD_UTF8_STRUCT_NAME) {
          return suiBcs.String;
        }
        if (typeSignature.datatype.module === STD_OPTION_MODULE_NAME && typeSignature.datatype.type === STD_OPTION_STRUCT_NAME) {
          const type = getPureBcsSchema(typeSignature.datatype.typeParameters[0]);
          return type ? suiBcs.vector(type) : null;
        }
      }
      if (pkg === normalizeSuiAddress(SUI_FRAMEWORK_ADDRESS) && typeSignature.datatype.module === OBJECT_MODULE_NAME && typeSignature.datatype.type === ID_STRUCT_NAME) {
        return suiBcs.Address;
      }
    }
    return null;
  }
  function normalizedTypeToMoveTypeSignature(type) {
    if (typeof type === "object" && "Reference" in type) {
      return {
        ref: "&",
        body: normalizedTypeToMoveTypeSignatureBody(type.Reference)
      };
    }
    if (typeof type === "object" && "MutableReference" in type) {
      return {
        ref: "&mut",
        body: normalizedTypeToMoveTypeSignatureBody(type.MutableReference)
      };
    }
    return {
      ref: null,
      body: normalizedTypeToMoveTypeSignatureBody(type)
    };
  }
  function normalizedTypeToMoveTypeSignatureBody(type) {
    if (typeof type === "string") {
      switch (type) {
        case "Address":
          return "address";
        case "Bool":
          return "bool";
        case "U8":
          return "u8";
        case "U16":
          return "u16";
        case "U32":
          return "u32";
        case "U64":
          return "u64";
        case "U128":
          return "u128";
        case "U256":
          return "u256";
        default:
          throw new Error(`Unexpected type ${type}`);
      }
    }
    if ("Vector" in type) {
      return { vector: normalizedTypeToMoveTypeSignatureBody(type.Vector) };
    }
    if ("Struct" in type) {
      return {
        datatype: {
          package: type.Struct.address,
          module: type.Struct.module,
          type: type.Struct.name,
          typeParameters: type.Struct.typeArguments.map(normalizedTypeToMoveTypeSignatureBody)
        }
      };
    }
    if ("TypeParameter" in type) {
      return { typeParameter: type.TypeParameter };
    }
    throw new Error(`Unexpected type ${JSON.stringify(type)}`);
  }

  // node_modules/@mysten/sui/dist/esm/transactions/Inputs.js
  function Pure(data) {
    return {
      $kind: "Pure",
      Pure: {
        bytes: data instanceof Uint8Array ? toBase64(data) : data.toBase64()
      }
    };
  }
  var Inputs = {
    Pure,
    ObjectRef({ objectId, digest, version }) {
      return {
        $kind: "Object",
        Object: {
          $kind: "ImmOrOwnedObject",
          ImmOrOwnedObject: {
            digest,
            version,
            objectId: normalizeSuiAddress(objectId)
          }
        }
      };
    },
    SharedObjectRef({
      objectId,
      mutable,
      initialSharedVersion
    }) {
      return {
        $kind: "Object",
        Object: {
          $kind: "SharedObject",
          SharedObject: {
            mutable,
            initialSharedVersion,
            objectId: normalizeSuiAddress(objectId)
          }
        }
      };
    },
    ReceivingRef({ objectId, digest, version }) {
      return {
        $kind: "Object",
        Object: {
          $kind: "Receiving",
          Receiving: {
            digest,
            version,
            objectId: normalizeSuiAddress(objectId)
          }
        }
      };
    }
  };

  // node_modules/valibot/dist/index.js
  var store;
  function getGlobalConfig(config2) {
    return {
      lang: config2?.lang ?? store?.lang,
      message: config2?.message,
      abortEarly: config2?.abortEarly ?? store?.abortEarly,
      abortPipeEarly: config2?.abortPipeEarly ?? store?.abortPipeEarly
    };
  }
  var store2;
  function getGlobalMessage(lang) {
    return store2?.get(lang);
  }
  var store3;
  function getSchemaMessage(lang) {
    return store3?.get(lang);
  }
  var store4;
  function getSpecificMessage(reference, lang) {
    return store4?.get(reference)?.get(lang);
  }
  function _stringify(input) {
    const type = typeof input;
    if (type === "string") {
      return `"${input}"`;
    }
    if (type === "number" || type === "bigint" || type === "boolean") {
      return `${input}`;
    }
    if (type === "object" || type === "function") {
      return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
    }
    return type;
  }
  function _addIssue(context, label, dataset, config2, other) {
    const input = other && "input" in other ? other.input : dataset.value;
    const expected = other?.expected ?? context.expects ?? null;
    const received = other?.received ?? _stringify(input);
    const issue = {
      kind: context.kind,
      type: context.type,
      input,
      expected,
      received,
      message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
      // @ts-expect-error
      requirement: context.requirement,
      path: other?.path,
      issues: other?.issues,
      lang: config2.lang,
      abortEarly: config2.abortEarly,
      abortPipeEarly: config2.abortPipeEarly
    };
    const isSchema = context.kind === "schema";
    const message = other?.message ?? // @ts-expect-error
    context.message ?? getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? getSchemaMessage(issue.lang) : null) ?? config2.message ?? getGlobalMessage(issue.lang);
    if (message) {
      issue.message = typeof message === "function" ? message(issue) : message;
    }
    if (isSchema) {
      dataset.typed = false;
    }
    if (dataset.issues) {
      dataset.issues.push(issue);
    } else {
      dataset.issues = [issue];
    }
  }
  function _isValidObjectKey(object2, key) {
    return Object.hasOwn(object2, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
  }
  var ValiError = class extends Error {
    /**
     * The error issues.
     */
    issues;
    /**
     * Creates a Valibot error with useful information.
     *
     * @param issues The error issues.
     */
    constructor(issues) {
      super(issues[0].message);
      this.name = "ValiError";
      this.issues = issues;
    }
  };
  function check(requirement, message) {
    return {
      kind: "validation",
      type: "check",
      reference: check,
      async: false,
      expects: null,
      requirement,
      message,
      _run(dataset, config2) {
        if (dataset.typed && !this.requirement(dataset.value)) {
          _addIssue(this, "input", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function integer(message) {
    return {
      kind: "validation",
      type: "integer",
      reference: integer,
      async: false,
      expects: null,
      requirement: Number.isInteger,
      message,
      _run(dataset, config2) {
        if (dataset.typed && !this.requirement(dataset.value)) {
          _addIssue(this, "integer", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function transform(operation) {
    return {
      kind: "transformation",
      type: "transform",
      reference: transform,
      async: false,
      operation,
      _run(dataset) {
        dataset.value = this.operation(dataset.value);
        return dataset;
      }
    };
  }
  function getDefault(schema, dataset, config2) {
    return typeof schema.default === "function" ? (
      // @ts-expect-error
      schema.default(dataset, config2)
    ) : (
      // @ts-expect-error
      schema.default
    );
  }
  function is(schema, input) {
    return !schema._run({ typed: false, value: input }, { abortEarly: true }).issues;
  }
  function array(item, message) {
    return {
      kind: "schema",
      type: "array",
      reference: array,
      expects: "Array",
      async: false,
      item,
      message,
      _run(dataset, config2) {
        const input = dataset.value;
        if (Array.isArray(input)) {
          dataset.typed = true;
          dataset.value = [];
          for (let key = 0; key < input.length; key++) {
            const value2 = input[key];
            const itemDataset = this.item._run({ typed: false, value: value2 }, config2);
            if (itemDataset.issues) {
              const pathItem = {
                type: "array",
                origin: "value",
                input,
                key,
                value: value2
              };
              for (const issue of itemDataset.issues) {
                if (issue.path) {
                  issue.path.unshift(pathItem);
                } else {
                  issue.path = [pathItem];
                }
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = itemDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!itemDataset.typed) {
              dataset.typed = false;
            }
            dataset.value.push(itemDataset.value);
          }
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function bigint(message) {
    return {
      kind: "schema",
      type: "bigint",
      reference: bigint,
      expects: "bigint",
      async: false,
      message,
      _run(dataset, config2) {
        if (typeof dataset.value === "bigint") {
          dataset.typed = true;
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function boolean(message) {
    return {
      kind: "schema",
      type: "boolean",
      reference: boolean,
      expects: "boolean",
      async: false,
      message,
      _run(dataset, config2) {
        if (typeof dataset.value === "boolean") {
          dataset.typed = true;
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function lazy(getter) {
    return {
      kind: "schema",
      type: "lazy",
      reference: lazy,
      expects: "unknown",
      async: false,
      getter,
      _run(dataset, config2) {
        return this.getter(dataset.value)._run(dataset, config2);
      }
    };
  }
  function literal(literal_, message) {
    return {
      kind: "schema",
      type: "literal",
      reference: literal,
      expects: _stringify(literal_),
      async: false,
      literal: literal_,
      message,
      _run(dataset, config2) {
        if (dataset.value === this.literal) {
          dataset.typed = true;
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function nullable(wrapped, ...args) {
    const schema = {
      kind: "schema",
      type: "nullable",
      reference: nullable,
      expects: `${wrapped.expects} | null`,
      async: false,
      wrapped,
      _run(dataset, config2) {
        if (dataset.value === null) {
          if ("default" in this) {
            dataset.value = getDefault(
              this,
              dataset,
              config2
            );
          }
          if (dataset.value === null) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped._run(dataset, config2);
      }
    };
    if (0 in args) {
      schema.default = args[0];
    }
    return schema;
  }
  function nullish(wrapped, ...args) {
    const schema = {
      kind: "schema",
      type: "nullish",
      reference: nullish,
      expects: `${wrapped.expects} | null | undefined`,
      async: false,
      wrapped,
      _run(dataset, config2) {
        if (dataset.value === null || dataset.value === void 0) {
          if ("default" in this) {
            dataset.value = getDefault(
              this,
              dataset,
              config2
            );
          }
          if (dataset.value === null || dataset.value === void 0) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped._run(dataset, config2);
      }
    };
    if (0 in args) {
      schema.default = args[0];
    }
    return schema;
  }
  function number(message) {
    return {
      kind: "schema",
      type: "number",
      reference: number,
      expects: "number",
      async: false,
      message,
      _run(dataset, config2) {
        if (typeof dataset.value === "number" && !isNaN(dataset.value)) {
          dataset.typed = true;
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function object(entries, message) {
    return {
      kind: "schema",
      type: "object",
      reference: object,
      expects: "Object",
      async: false,
      entries,
      message,
      _run(dataset, config2) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const key in this.entries) {
            const value2 = input[key];
            const valueDataset = this.entries[key]._run(
              { typed: false, value: value2 },
              config2
            );
            if (valueDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "value",
                input,
                key,
                value: value2
              };
              for (const issue of valueDataset.issues) {
                if (issue.path) {
                  issue.path.unshift(pathItem);
                } else {
                  issue.path = [pathItem];
                }
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = valueDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!valueDataset.typed) {
              dataset.typed = false;
            }
            if (valueDataset.value !== void 0 || key in input) {
              dataset.value[key] = valueDataset.value;
            }
          }
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function optional(wrapped, ...args) {
    const schema = {
      kind: "schema",
      type: "optional",
      reference: optional,
      expects: `${wrapped.expects} | undefined`,
      async: false,
      wrapped,
      _run(dataset, config2) {
        if (dataset.value === void 0) {
          if ("default" in this) {
            dataset.value = getDefault(
              this,
              dataset,
              config2
            );
          }
          if (dataset.value === void 0) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped._run(dataset, config2);
      }
    };
    if (0 in args) {
      schema.default = args[0];
    }
    return schema;
  }
  function record(key, value2, message) {
    return {
      kind: "schema",
      type: "record",
      reference: record,
      expects: "Object",
      async: false,
      key,
      value: value2,
      message,
      _run(dataset, config2) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const entryKey in input) {
            if (_isValidObjectKey(input, entryKey)) {
              const entryValue = input[entryKey];
              const keyDataset = this.key._run(
                { typed: false, value: entryKey },
                config2
              );
              if (keyDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "key",
                  input,
                  key: entryKey,
                  value: entryValue
                };
                for (const issue of keyDataset.issues) {
                  issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues) {
                  dataset.issues = keyDataset.issues;
                }
                if (config2.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              const valueDataset = this.value._run(
                { typed: false, value: entryValue },
                config2
              );
              if (valueDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "value",
                  input,
                  key: entryKey,
                  value: entryValue
                };
                for (const issue of valueDataset.issues) {
                  if (issue.path) {
                    issue.path.unshift(pathItem);
                  } else {
                    issue.path = [pathItem];
                  }
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues) {
                  dataset.issues = valueDataset.issues;
                }
                if (config2.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              if (!keyDataset.typed || !valueDataset.typed) {
                dataset.typed = false;
              }
              if (keyDataset.typed) {
                dataset.value[keyDataset.value] = valueDataset.value;
              }
            }
          }
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function string(message) {
    return {
      kind: "schema",
      type: "string",
      reference: string,
      expects: "string",
      async: false,
      message,
      _run(dataset, config2) {
        if (typeof dataset.value === "string") {
          dataset.typed = true;
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function tuple(items, message) {
    return {
      kind: "schema",
      type: "tuple",
      reference: tuple,
      expects: "Array",
      async: false,
      items,
      message,
      _run(dataset, config2) {
        const input = dataset.value;
        if (Array.isArray(input)) {
          dataset.typed = true;
          dataset.value = [];
          for (let key = 0; key < this.items.length; key++) {
            const value2 = input[key];
            const itemDataset = this.items[key]._run(
              { typed: false, value: value2 },
              config2
            );
            if (itemDataset.issues) {
              const pathItem = {
                type: "array",
                origin: "value",
                input,
                key,
                value: value2
              };
              for (const issue of itemDataset.issues) {
                if (issue.path) {
                  issue.path.unshift(pathItem);
                } else {
                  issue.path = [pathItem];
                }
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = itemDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!itemDataset.typed) {
              dataset.typed = false;
            }
            dataset.value.push(itemDataset.value);
          }
        } else {
          _addIssue(this, "type", dataset, config2);
        }
        return dataset;
      }
    };
  }
  function _subIssues(datasets) {
    let issues;
    if (datasets) {
      for (const dataset of datasets) {
        if (issues) {
          issues.push(...dataset.issues);
        } else {
          issues = dataset.issues;
        }
      }
    }
    return issues;
  }
  function union(options, message) {
    return {
      kind: "schema",
      type: "union",
      reference: union,
      expects: [...new Set(options.map((option) => option.expects))].join(" | ") || "never",
      async: false,
      options,
      message,
      _run(dataset, config2) {
        let validDataset;
        let typedDatasets;
        let untypedDatasets;
        for (const schema of this.options) {
          const optionDataset = schema._run(
            { typed: false, value: dataset.value },
            config2
          );
          if (optionDataset.typed) {
            if (optionDataset.issues) {
              if (typedDatasets) {
                typedDatasets.push(optionDataset);
              } else {
                typedDatasets = [optionDataset];
              }
            } else {
              validDataset = optionDataset;
              break;
            }
          } else {
            if (untypedDatasets) {
              untypedDatasets.push(optionDataset);
            } else {
              untypedDatasets = [optionDataset];
            }
          }
        }
        if (validDataset) {
          return validDataset;
        }
        if (typedDatasets) {
          if (typedDatasets.length === 1) {
            return typedDatasets[0];
          }
          _addIssue(this, "type", dataset, config2, {
            issues: _subIssues(typedDatasets)
          });
          dataset.typed = true;
        } else if (untypedDatasets?.length === 1) {
          return untypedDatasets[0];
        } else {
          _addIssue(this, "type", dataset, config2, {
            issues: _subIssues(untypedDatasets)
          });
        }
        return dataset;
      }
    };
  }
  function unknown() {
    return {
      kind: "schema",
      type: "unknown",
      reference: unknown,
      expects: "unknown",
      async: false,
      _run(dataset) {
        dataset.typed = true;
        return dataset;
      }
    };
  }
  function parse(schema, input, config2) {
    const dataset = schema._run(
      { typed: false, value: input },
      getGlobalConfig(config2)
    );
    if (dataset.issues) {
      throw new ValiError(dataset.issues);
    }
    return dataset.value;
  }
  function pipe(...pipe2) {
    return {
      ...pipe2[0],
      pipe: pipe2,
      _run(dataset, config2) {
        for (let index = 0; index < pipe2.length; index++) {
          if (dataset.issues && (pipe2[index].kind === "schema" || pipe2[index].kind === "transformation")) {
            dataset.typed = false;
            break;
          }
          if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) {
            dataset = pipe2[index]._run(dataset, config2);
          }
        }
        return dataset;
      }
    };
  }

  // node_modules/@mysten/sui/dist/esm/transactions/data/internal.js
  function safeEnum(options) {
    const unionOptions = Object.entries(options).map(([key, value]) => object({ [key]: value }));
    return pipe(
      union(unionOptions),
      transform((value) => ({
        ...value,
        $kind: Object.keys(value)[0]
      }))
    );
  }
  var SuiAddress = pipe(
    string(),
    transform((value) => normalizeSuiAddress(value)),
    check(isValidSuiAddress)
  );
  var ObjectID = SuiAddress;
  var BCSBytes = string();
  var JsonU64 = pipe(
    union([string(), pipe(number(), integer())]),
    check((val) => {
      try {
        BigInt(val);
        return BigInt(val) >= 0 && BigInt(val) <= 18446744073709551615n;
      } catch {
        return false;
      }
    }, "Invalid u64")
  );
  var ObjectRef = object({
    objectId: SuiAddress,
    version: JsonU64,
    digest: string()
  });
  var Argument2 = pipe(
    union([
      object({ GasCoin: literal(true) }),
      object({ Input: pipe(number(), integer()), type: optional(literal("pure")) }),
      object({ Input: pipe(number(), integer()), type: optional(literal("object")) }),
      object({ Result: pipe(number(), integer()) }),
      object({ NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())]) })
    ]),
    transform((value) => ({
      ...value,
      $kind: Object.keys(value)[0]
    }))
    // Defined manually to add `type?: 'pure' | 'object'` to Input
  );
  var GasData2 = object({
    budget: nullable(JsonU64),
    price: nullable(JsonU64),
    owner: nullable(SuiAddress),
    payment: nullable(array(ObjectRef))
  });
  var StructTag2 = object({
    address: string(),
    module: string(),
    name: string(),
    // type_params in rust, should be updated to use camelCase
    typeParams: array(string())
  });
  var OpenMoveTypeSignatureBody = union([
    literal("address"),
    literal("bool"),
    literal("u8"),
    literal("u16"),
    literal("u32"),
    literal("u64"),
    literal("u128"),
    literal("u256"),
    object({ vector: lazy(() => OpenMoveTypeSignatureBody) }),
    object({
      datatype: object({
        package: string(),
        module: string(),
        type: string(),
        typeParameters: array(lazy(() => OpenMoveTypeSignatureBody))
      })
    }),
    object({ typeParameter: pipe(number(), integer()) })
  ]);
  var OpenMoveTypeSignature = object({
    ref: nullable(union([literal("&"), literal("&mut")])),
    body: OpenMoveTypeSignatureBody
  });
  var ProgrammableMoveCall2 = object({
    package: ObjectID,
    module: string(),
    function: string(),
    // snake case in rust
    typeArguments: array(string()),
    arguments: array(Argument2),
    _argumentTypes: optional(nullable(array(OpenMoveTypeSignature)))
  });
  var $Intent = object({
    name: string(),
    inputs: record(string(), union([Argument2, array(Argument2)])),
    data: record(string(), unknown())
  });
  var Command2 = safeEnum({
    MoveCall: ProgrammableMoveCall2,
    TransferObjects: object({
      objects: array(Argument2),
      address: Argument2
    }),
    SplitCoins: object({
      coin: Argument2,
      amounts: array(Argument2)
    }),
    MergeCoins: object({
      destination: Argument2,
      sources: array(Argument2)
    }),
    Publish: object({
      modules: array(BCSBytes),
      dependencies: array(ObjectID)
    }),
    MakeMoveVec: object({
      type: nullable(string()),
      elements: array(Argument2)
    }),
    Upgrade: object({
      modules: array(BCSBytes),
      dependencies: array(ObjectID),
      package: ObjectID,
      ticket: Argument2
    }),
    $Intent
  });
  var ObjectArg2 = safeEnum({
    ImmOrOwnedObject: ObjectRef,
    SharedObject: object({
      objectId: ObjectID,
      // snake case in rust
      initialSharedVersion: JsonU64,
      mutable: boolean()
    }),
    Receiving: ObjectRef
  });
  var CallArg2 = safeEnum({
    Object: ObjectArg2,
    Pure: object({
      bytes: BCSBytes
    }),
    UnresolvedPure: object({
      value: unknown()
    }),
    UnresolvedObject: object({
      objectId: ObjectID,
      version: optional(nullable(JsonU64)),
      digest: optional(nullable(string())),
      initialSharedVersion: optional(nullable(JsonU64))
    })
  });
  var NormalizedCallArg = safeEnum({
    Object: ObjectArg2,
    Pure: object({
      bytes: BCSBytes
    })
  });
  var TransactionExpiration2 = safeEnum({
    None: literal(true),
    Epoch: JsonU64
  });
  var TransactionData2 = object({
    version: literal(2),
    sender: nullish(SuiAddress),
    expiration: nullish(TransactionExpiration2),
    gasData: GasData2,
    inputs: array(CallArg2),
    commands: array(Command2)
  });

  // node_modules/@mysten/sui/dist/esm/transactions/Commands.js
  var Commands = {
    MoveCall(input) {
      const [pkg, mod2 = "", fn = ""] = "target" in input ? input.target.split("::") : [input.package, input.module, input.function];
      return {
        $kind: "MoveCall",
        MoveCall: {
          package: pkg,
          module: mod2,
          function: fn,
          typeArguments: input.typeArguments ?? [],
          arguments: input.arguments ?? []
        }
      };
    },
    TransferObjects(objects, address) {
      return {
        $kind: "TransferObjects",
        TransferObjects: {
          objects: objects.map((o) => parse(Argument2, o)),
          address: parse(Argument2, address)
        }
      };
    },
    SplitCoins(coin, amounts) {
      return {
        $kind: "SplitCoins",
        SplitCoins: {
          coin: parse(Argument2, coin),
          amounts: amounts.map((o) => parse(Argument2, o))
        }
      };
    },
    MergeCoins(destination, sources) {
      return {
        $kind: "MergeCoins",
        MergeCoins: {
          destination: parse(Argument2, destination),
          sources: sources.map((o) => parse(Argument2, o))
        }
      };
    },
    Publish({
      modules,
      dependencies
    }) {
      return {
        $kind: "Publish",
        Publish: {
          modules: modules.map(
            (module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))
          ),
          dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep))
        }
      };
    },
    Upgrade({
      modules,
      dependencies,
      package: packageId,
      ticket
    }) {
      return {
        $kind: "Upgrade",
        Upgrade: {
          modules: modules.map(
            (module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))
          ),
          dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep)),
          package: packageId,
          ticket: parse(Argument2, ticket)
        }
      };
    },
    MakeMoveVec({
      type,
      elements
    }) {
      return {
        $kind: "MakeMoveVec",
        MakeMoveVec: {
          type: type ?? null,
          elements: elements.map((o) => parse(Argument2, o))
        }
      };
    },
    Intent({
      name,
      inputs = {},
      data = {}
    }) {
      return {
        $kind: "$Intent",
        $Intent: {
          name,
          inputs: Object.fromEntries(
            Object.entries(inputs).map(([key, value]) => [
              key,
              Array.isArray(value) ? value.map((o) => parse(Argument2, o)) : parse(Argument2, value)
            ])
          ),
          data
        }
      };
    }
  };

  // node_modules/@mysten/sui/dist/esm/transactions/data/v1.js
  var ObjectRef2 = object({
    digest: string(),
    objectId: string(),
    version: union([pipe(number(), integer()), string(), bigint()])
  });
  var ObjectArg3 = safeEnum({
    ImmOrOwned: ObjectRef2,
    Shared: object({
      objectId: ObjectID,
      initialSharedVersion: JsonU64,
      mutable: boolean()
    }),
    Receiving: ObjectRef2
  });
  var NormalizedCallArg2 = safeEnum({
    Object: ObjectArg3,
    Pure: array(pipe(number(), integer()))
  });
  var TransactionInput = union([
    object({
      kind: literal("Input"),
      index: pipe(number(), integer()),
      value: unknown(),
      type: optional(literal("object"))
    }),
    object({
      kind: literal("Input"),
      index: pipe(number(), integer()),
      value: unknown(),
      type: literal("pure")
    })
  ]);
  var TransactionExpiration3 = union([
    object({ Epoch: pipe(number(), integer()) }),
    object({ None: nullable(literal(true)) })
  ]);
  var StringEncodedBigint = pipe(
    union([number(), string(), bigint()]),
    check((val) => {
      if (!["string", "number", "bigint"].includes(typeof val)) return false;
      try {
        BigInt(val);
        return true;
      } catch {
        return false;
      }
    })
  );
  var TypeTag2 = union([
    object({ bool: nullable(literal(true)) }),
    object({ u8: nullable(literal(true)) }),
    object({ u64: nullable(literal(true)) }),
    object({ u128: nullable(literal(true)) }),
    object({ address: nullable(literal(true)) }),
    object({ signer: nullable(literal(true)) }),
    object({ vector: lazy(() => TypeTag2) }),
    object({ struct: lazy(() => StructTag3) }),
    object({ u16: nullable(literal(true)) }),
    object({ u32: nullable(literal(true)) }),
    object({ u256: nullable(literal(true)) })
  ]);
  var StructTag3 = object({
    address: string(),
    module: string(),
    name: string(),
    typeParams: array(TypeTag2)
  });
  var GasConfig = object({
    budget: optional(StringEncodedBigint),
    price: optional(StringEncodedBigint),
    payment: optional(array(ObjectRef2)),
    owner: optional(string())
  });
  var TransactionArgumentTypes = [
    TransactionInput,
    object({ kind: literal("GasCoin") }),
    object({ kind: literal("Result"), index: pipe(number(), integer()) }),
    object({
      kind: literal("NestedResult"),
      index: pipe(number(), integer()),
      resultIndex: pipe(number(), integer())
    })
  ];
  var TransactionArgument = union([...TransactionArgumentTypes]);
  var MoveCallTransaction = object({
    kind: literal("MoveCall"),
    target: pipe(
      string(),
      check((target) => target.split("::").length === 3)
    ),
    typeArguments: array(string()),
    arguments: array(TransactionArgument)
  });
  var TransferObjectsTransaction = object({
    kind: literal("TransferObjects"),
    objects: array(TransactionArgument),
    address: TransactionArgument
  });
  var SplitCoinsTransaction = object({
    kind: literal("SplitCoins"),
    coin: TransactionArgument,
    amounts: array(TransactionArgument)
  });
  var MergeCoinsTransaction = object({
    kind: literal("MergeCoins"),
    destination: TransactionArgument,
    sources: array(TransactionArgument)
  });
  var MakeMoveVecTransaction = object({
    kind: literal("MakeMoveVec"),
    type: union([object({ Some: TypeTag2 }), object({ None: nullable(literal(true)) })]),
    objects: array(TransactionArgument)
  });
  var PublishTransaction = object({
    kind: literal("Publish"),
    modules: array(array(pipe(number(), integer()))),
    dependencies: array(string())
  });
  var UpgradeTransaction = object({
    kind: literal("Upgrade"),
    modules: array(array(pipe(number(), integer()))),
    dependencies: array(string()),
    packageId: string(),
    ticket: TransactionArgument
  });
  var TransactionTypes = [
    MoveCallTransaction,
    TransferObjectsTransaction,
    SplitCoinsTransaction,
    MergeCoinsTransaction,
    PublishTransaction,
    UpgradeTransaction,
    MakeMoveVecTransaction
  ];
  var TransactionType = union([...TransactionTypes]);
  var SerializedTransactionDataV1 = object({
    version: literal(1),
    sender: optional(string()),
    expiration: nullish(TransactionExpiration3),
    gasConfig: GasConfig,
    inputs: array(TransactionInput),
    transactions: array(TransactionType)
  });
  function serializeV1TransactionData(transactionData) {
    const inputs = transactionData.inputs.map(
      (input, index) => {
        if (input.Object) {
          return {
            kind: "Input",
            index,
            value: {
              Object: input.Object.ImmOrOwnedObject ? {
                ImmOrOwned: input.Object.ImmOrOwnedObject
              } : input.Object.Receiving ? {
                Receiving: {
                  digest: input.Object.Receiving.digest,
                  version: input.Object.Receiving.version,
                  objectId: input.Object.Receiving.objectId
                }
              } : {
                Shared: {
                  mutable: input.Object.SharedObject.mutable,
                  initialSharedVersion: input.Object.SharedObject.initialSharedVersion,
                  objectId: input.Object.SharedObject.objectId
                }
              }
            },
            type: "object"
          };
        }
        if (input.Pure) {
          return {
            kind: "Input",
            index,
            value: {
              Pure: Array.from(fromBase64(input.Pure.bytes))
            },
            type: "pure"
          };
        }
        if (input.UnresolvedPure) {
          return {
            kind: "Input",
            type: "pure",
            index,
            value: input.UnresolvedPure.value
          };
        }
        if (input.UnresolvedObject) {
          return {
            kind: "Input",
            type: "object",
            index,
            value: input.UnresolvedObject.objectId
          };
        }
        throw new Error("Invalid input");
      }
    );
    return {
      version: 1,
      sender: transactionData.sender ?? void 0,
      expiration: transactionData.expiration?.$kind === "Epoch" ? { Epoch: Number(transactionData.expiration.Epoch) } : transactionData.expiration ? { None: true } : null,
      gasConfig: {
        owner: transactionData.gasData.owner ?? void 0,
        budget: transactionData.gasData.budget ?? void 0,
        price: transactionData.gasData.price ?? void 0,
        payment: transactionData.gasData.payment ?? void 0
      },
      inputs,
      transactions: transactionData.commands.map((command) => {
        if (command.MakeMoveVec) {
          return {
            kind: "MakeMoveVec",
            type: command.MakeMoveVec.type === null ? { None: true } : { Some: TypeTagSerializer.parseFromStr(command.MakeMoveVec.type) },
            objects: command.MakeMoveVec.elements.map(
              (arg) => convertTransactionArgument(arg, inputs)
            )
          };
        }
        if (command.MergeCoins) {
          return {
            kind: "MergeCoins",
            destination: convertTransactionArgument(command.MergeCoins.destination, inputs),
            sources: command.MergeCoins.sources.map((arg) => convertTransactionArgument(arg, inputs))
          };
        }
        if (command.MoveCall) {
          return {
            kind: "MoveCall",
            target: `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`,
            typeArguments: command.MoveCall.typeArguments,
            arguments: command.MoveCall.arguments.map(
              (arg) => convertTransactionArgument(arg, inputs)
            )
          };
        }
        if (command.Publish) {
          return {
            kind: "Publish",
            modules: command.Publish.modules.map((mod2) => Array.from(fromBase64(mod2))),
            dependencies: command.Publish.dependencies
          };
        }
        if (command.SplitCoins) {
          return {
            kind: "SplitCoins",
            coin: convertTransactionArgument(command.SplitCoins.coin, inputs),
            amounts: command.SplitCoins.amounts.map((arg) => convertTransactionArgument(arg, inputs))
          };
        }
        if (command.TransferObjects) {
          return {
            kind: "TransferObjects",
            objects: command.TransferObjects.objects.map(
              (arg) => convertTransactionArgument(arg, inputs)
            ),
            address: convertTransactionArgument(command.TransferObjects.address, inputs)
          };
        }
        if (command.Upgrade) {
          return {
            kind: "Upgrade",
            modules: command.Upgrade.modules.map((mod2) => Array.from(fromBase64(mod2))),
            dependencies: command.Upgrade.dependencies,
            packageId: command.Upgrade.package,
            ticket: convertTransactionArgument(command.Upgrade.ticket, inputs)
          };
        }
        throw new Error(`Unknown transaction ${Object.keys(command)}`);
      })
    };
  }
  function convertTransactionArgument(arg, inputs) {
    if (arg.$kind === "GasCoin") {
      return { kind: "GasCoin" };
    }
    if (arg.$kind === "Result") {
      return { kind: "Result", index: arg.Result };
    }
    if (arg.$kind === "NestedResult") {
      return { kind: "NestedResult", index: arg.NestedResult[0], resultIndex: arg.NestedResult[1] };
    }
    if (arg.$kind === "Input") {
      return inputs[arg.Input];
    }
    throw new Error(`Invalid argument ${Object.keys(arg)}`);
  }
  function transactionDataFromV1(data) {
    return parse(TransactionData2, {
      version: 2,
      sender: data.sender ?? null,
      expiration: data.expiration ? "Epoch" in data.expiration ? { Epoch: data.expiration.Epoch } : { None: true } : null,
      gasData: {
        owner: data.gasConfig.owner ?? null,
        budget: data.gasConfig.budget?.toString() ?? null,
        price: data.gasConfig.price?.toString() ?? null,
        payment: data.gasConfig.payment?.map((ref) => ({
          digest: ref.digest,
          objectId: ref.objectId,
          version: ref.version.toString()
        })) ?? null
      },
      inputs: data.inputs.map((input) => {
        if (input.kind === "Input") {
          if (is(NormalizedCallArg2, input.value)) {
            const value = parse(NormalizedCallArg2, input.value);
            if (value.Object) {
              if (value.Object.ImmOrOwned) {
                return {
                  Object: {
                    ImmOrOwnedObject: {
                      objectId: value.Object.ImmOrOwned.objectId,
                      version: String(value.Object.ImmOrOwned.version),
                      digest: value.Object.ImmOrOwned.digest
                    }
                  }
                };
              }
              if (value.Object.Shared) {
                return {
                  Object: {
                    SharedObject: {
                      mutable: value.Object.Shared.mutable ?? null,
                      initialSharedVersion: value.Object.Shared.initialSharedVersion,
                      objectId: value.Object.Shared.objectId
                    }
                  }
                };
              }
              if (value.Object.Receiving) {
                return {
                  Object: {
                    Receiving: {
                      digest: value.Object.Receiving.digest,
                      version: String(value.Object.Receiving.version),
                      objectId: value.Object.Receiving.objectId
                    }
                  }
                };
              }
              throw new Error("Invalid object input");
            }
            return {
              Pure: {
                bytes: toBase64(new Uint8Array(value.Pure))
              }
            };
          }
          if (input.type === "object") {
            return {
              UnresolvedObject: {
                objectId: input.value
              }
            };
          }
          return {
            UnresolvedPure: {
              value: input.value
            }
          };
        }
        throw new Error("Invalid input");
      }),
      commands: data.transactions.map((transaction) => {
        switch (transaction.kind) {
          case "MakeMoveVec":
            return {
              MakeMoveVec: {
                type: "Some" in transaction.type ? TypeTagSerializer.tagToString(transaction.type.Some) : null,
                elements: transaction.objects.map((arg) => parseV1TransactionArgument(arg))
              }
            };
          case "MergeCoins": {
            return {
              MergeCoins: {
                destination: parseV1TransactionArgument(transaction.destination),
                sources: transaction.sources.map((arg) => parseV1TransactionArgument(arg))
              }
            };
          }
          case "MoveCall": {
            const [pkg, mod2, fn] = transaction.target.split("::");
            return {
              MoveCall: {
                package: pkg,
                module: mod2,
                function: fn,
                typeArguments: transaction.typeArguments,
                arguments: transaction.arguments.map((arg) => parseV1TransactionArgument(arg))
              }
            };
          }
          case "Publish": {
            return {
              Publish: {
                modules: transaction.modules.map((mod2) => toBase64(Uint8Array.from(mod2))),
                dependencies: transaction.dependencies
              }
            };
          }
          case "SplitCoins": {
            return {
              SplitCoins: {
                coin: parseV1TransactionArgument(transaction.coin),
                amounts: transaction.amounts.map((arg) => parseV1TransactionArgument(arg))
              }
            };
          }
          case "TransferObjects": {
            return {
              TransferObjects: {
                objects: transaction.objects.map((arg) => parseV1TransactionArgument(arg)),
                address: parseV1TransactionArgument(transaction.address)
              }
            };
          }
          case "Upgrade": {
            return {
              Upgrade: {
                modules: transaction.modules.map((mod2) => toBase64(Uint8Array.from(mod2))),
                dependencies: transaction.dependencies,
                package: transaction.packageId,
                ticket: parseV1TransactionArgument(transaction.ticket)
              }
            };
          }
        }
        throw new Error(`Unknown transaction ${Object.keys(transaction)}`);
      })
    });
  }
  function parseV1TransactionArgument(arg) {
    switch (arg.kind) {
      case "GasCoin": {
        return { GasCoin: true };
      }
      case "Result":
        return { Result: arg.index };
      case "NestedResult": {
        return { NestedResult: [arg.index, arg.resultIndex] };
      }
      case "Input": {
        return { Input: arg.index };
      }
    }
  }

  // node_modules/@mysten/sui/dist/esm/transactions/data/v2.js
  function enumUnion(options) {
    return union(
      Object.entries(options).map(([key, value]) => object({ [key]: value }))
    );
  }
  var Argument3 = enumUnion({
    GasCoin: literal(true),
    Input: pipe(number(), integer()),
    Result: pipe(number(), integer()),
    NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())])
  });
  var GasData3 = object({
    budget: nullable(JsonU64),
    price: nullable(JsonU64),
    owner: nullable(SuiAddress),
    payment: nullable(array(ObjectRef))
  });
  var ProgrammableMoveCall3 = object({
    package: ObjectID,
    module: string(),
    function: string(),
    // snake case in rust
    typeArguments: array(string()),
    arguments: array(Argument3)
  });
  var $Intent2 = object({
    name: string(),
    inputs: record(string(), union([Argument3, array(Argument3)])),
    data: record(string(), unknown())
  });
  var Command3 = enumUnion({
    MoveCall: ProgrammableMoveCall3,
    TransferObjects: object({
      objects: array(Argument3),
      address: Argument3
    }),
    SplitCoins: object({
      coin: Argument3,
      amounts: array(Argument3)
    }),
    MergeCoins: object({
      destination: Argument3,
      sources: array(Argument3)
    }),
    Publish: object({
      modules: array(BCSBytes),
      dependencies: array(ObjectID)
    }),
    MakeMoveVec: object({
      type: nullable(string()),
      elements: array(Argument3)
    }),
    Upgrade: object({
      modules: array(BCSBytes),
      dependencies: array(ObjectID),
      package: ObjectID,
      ticket: Argument3
    }),
    $Intent: $Intent2
  });
  var ObjectArg4 = enumUnion({
    ImmOrOwnedObject: ObjectRef,
    SharedObject: object({
      objectId: ObjectID,
      // snake case in rust
      initialSharedVersion: JsonU64,
      mutable: boolean()
    }),
    Receiving: ObjectRef
  });
  var CallArg3 = enumUnion({
    Object: ObjectArg4,
    Pure: object({
      bytes: BCSBytes
    }),
    UnresolvedPure: object({
      value: unknown()
    }),
    UnresolvedObject: object({
      objectId: ObjectID,
      version: optional(nullable(JsonU64)),
      digest: optional(nullable(string())),
      initialSharedVersion: optional(nullable(JsonU64))
    })
  });
  var TransactionExpiration4 = enumUnion({
    None: literal(true),
    Epoch: JsonU64
  });
  var SerializedTransactionDataV2 = object({
    version: literal(2),
    sender: nullish(SuiAddress),
    expiration: nullish(TransactionExpiration4),
    gasData: GasData3,
    inputs: array(CallArg3),
    commands: array(Command3)
  });

  // node_modules/@mysten/sui/dist/esm/transactions/json-rpc-resolver.js
  var MAX_OBJECTS_PER_FETCH = 50;
  var GAS_SAFE_OVERHEAD = 1000n;
  var MAX_GAS = 5e10;
  async function resolveTransactionData(transactionData, options, next) {
    await normalizeInputs(transactionData, options);
    await resolveObjectReferences(transactionData, options);
    if (!options.onlyTransactionKind) {
      await setGasPrice(transactionData, options);
      await setGasBudget(transactionData, options);
      await setGasPayment(transactionData, options);
    }
    await validate(transactionData);
    return await next();
  }
  async function setGasPrice(transactionData, options) {
    if (!transactionData.gasConfig.price) {
      transactionData.gasConfig.price = String(await getClient(options).getReferenceGasPrice());
    }
  }
  async function setGasBudget(transactionData, options) {
    if (transactionData.gasConfig.budget) {
      return;
    }
    const dryRunResult = await getClient(options).dryRunTransactionBlock({
      transactionBlock: transactionData.build({
        overrides: {
          gasData: {
            budget: String(MAX_GAS),
            payment: []
          }
        }
      })
    });
    if (dryRunResult.effects.status.status !== "success") {
      throw new Error(
        `Dry run failed, could not automatically determine a budget: ${dryRunResult.effects.status.error}`,
        { cause: dryRunResult }
      );
    }
    const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(transactionData.gasConfig.price || 1n);
    const baseComputationCostWithOverhead = BigInt(dryRunResult.effects.gasUsed.computationCost) + safeOverhead;
    const gasBudget = baseComputationCostWithOverhead + BigInt(dryRunResult.effects.gasUsed.storageCost) - BigInt(dryRunResult.effects.gasUsed.storageRebate);
    transactionData.gasConfig.budget = String(
      gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead
    );
  }
  async function setGasPayment(transactionData, options) {
    if (!transactionData.gasConfig.payment) {
      const coins = await getClient(options).getCoins({
        owner: transactionData.gasConfig.owner || transactionData.sender,
        coinType: SUI_TYPE_ARG
      });
      const paymentCoins = coins.data.filter((coin) => {
        const matchingInput = transactionData.inputs.find((input) => {
          if (input.Object?.ImmOrOwnedObject) {
            return coin.coinObjectId === input.Object.ImmOrOwnedObject.objectId;
          }
          return false;
        });
        return !matchingInput;
      }).map((coin) => ({
        objectId: coin.coinObjectId,
        digest: coin.digest,
        version: coin.version
      }));
      if (!paymentCoins.length) {
        throw new Error("No valid gas coins found for the transaction.");
      }
      transactionData.gasConfig.payment = paymentCoins.map((payment) => parse(ObjectRef, payment));
    }
  }
  async function resolveObjectReferences(transactionData, options) {
    const objectsToResolve = transactionData.inputs.filter((input) => {
      return input.UnresolvedObject && !(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion);
    });
    const dedupedIds = [
      ...new Set(
        objectsToResolve.map((input) => normalizeSuiObjectId(input.UnresolvedObject.objectId))
      )
    ];
    const objectChunks = dedupedIds.length ? chunk(dedupedIds, MAX_OBJECTS_PER_FETCH) : [];
    const resolved = (await Promise.all(
      objectChunks.map(
        (chunk2) => getClient(options).multiGetObjects({
          ids: chunk2,
          options: { showOwner: true }
        })
      )
    )).flat();
    const responsesById = new Map(
      dedupedIds.map((id, index) => {
        return [id, resolved[index]];
      })
    );
    const invalidObjects = Array.from(responsesById).filter(([_, obj]) => obj.error).map(([_, obj]) => JSON.stringify(obj.error));
    if (invalidObjects.length) {
      throw new Error(`The following input objects are invalid: ${invalidObjects.join(", ")}`);
    }
    const objects = resolved.map((object2) => {
      if (object2.error || !object2.data) {
        throw new Error(`Failed to fetch object: ${object2.error}`);
      }
      const owner = object2.data.owner;
      const initialSharedVersion = owner && typeof owner === "object" && "Shared" in owner ? owner.Shared.initial_shared_version : null;
      return {
        objectId: object2.data.objectId,
        digest: object2.data.digest,
        version: object2.data.version,
        initialSharedVersion
      };
    });
    const objectsById = new Map(
      dedupedIds.map((id, index) => {
        return [id, objects[index]];
      })
    );
    for (const [index, input] of transactionData.inputs.entries()) {
      if (!input.UnresolvedObject) {
        continue;
      }
      let updated;
      const id = normalizeSuiAddress(input.UnresolvedObject.objectId);
      const object2 = objectsById.get(id);
      if (input.UnresolvedObject.initialSharedVersion ?? object2?.initialSharedVersion) {
        updated = Inputs.SharedObjectRef({
          objectId: id,
          initialSharedVersion: input.UnresolvedObject.initialSharedVersion || object2?.initialSharedVersion,
          mutable: isUsedAsMutable(transactionData, index)
        });
      } else if (isUsedAsReceiving(transactionData, index)) {
        updated = Inputs.ReceivingRef(
          {
            objectId: id,
            digest: input.UnresolvedObject.digest ?? object2?.digest,
            version: input.UnresolvedObject.version ?? object2?.version
          }
        );
      }
      transactionData.inputs[transactionData.inputs.indexOf(input)] = updated ?? Inputs.ObjectRef({
        objectId: id,
        digest: input.UnresolvedObject.digest ?? object2?.digest,
        version: input.UnresolvedObject.version ?? object2?.version
      });
    }
  }
  async function normalizeInputs(transactionData, options) {
    const { inputs, commands } = transactionData;
    const moveCallsToResolve = [];
    const moveFunctionsToResolve = /* @__PURE__ */ new Set();
    commands.forEach((command) => {
      if (command.MoveCall) {
        if (command.MoveCall._argumentTypes) {
          return;
        }
        const inputs2 = command.MoveCall.arguments.map((arg) => {
          if (arg.$kind === "Input") {
            return transactionData.inputs[arg.Input];
          }
          return null;
        });
        const needsResolution = inputs2.some(
          (input) => input?.UnresolvedPure || input?.UnresolvedObject
        );
        if (needsResolution) {
          const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
          moveFunctionsToResolve.add(functionName);
          moveCallsToResolve.push(command.MoveCall);
        }
      }
      switch (command.$kind) {
        case "SplitCoins":
          command.SplitCoins.amounts.forEach((amount) => {
            normalizeRawArgument(amount, suiBcs.U64, transactionData);
          });
          break;
        case "TransferObjects":
          normalizeRawArgument(command.TransferObjects.address, suiBcs.Address, transactionData);
          break;
      }
    });
    const moveFunctionParameters = /* @__PURE__ */ new Map();
    if (moveFunctionsToResolve.size > 0) {
      const client = getClient(options);
      await Promise.all(
        [...moveFunctionsToResolve].map(async (functionName) => {
          const [packageId, moduleId, functionId] = functionName.split("::");
          const def = await client.getNormalizedMoveFunction({
            package: packageId,
            module: moduleId,
            function: functionId
          });
          moveFunctionParameters.set(
            functionName,
            def.parameters.map((param) => normalizedTypeToMoveTypeSignature(param))
          );
        })
      );
    }
    if (moveCallsToResolve.length) {
      await Promise.all(
        moveCallsToResolve.map(async (moveCall) => {
          const parameters = moveFunctionParameters.get(
            `${moveCall.package}::${moveCall.module}::${moveCall.function}`
          );
          if (!parameters) {
            return;
          }
          const hasTxContext = parameters.length > 0 && isTxContext(parameters.at(-1));
          const params = hasTxContext ? parameters.slice(0, parameters.length - 1) : parameters;
          moveCall._argumentTypes = params;
        })
      );
    }
    commands.forEach((command) => {
      if (!command.MoveCall) {
        return;
      }
      const moveCall = command.MoveCall;
      const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
      const params = moveCall._argumentTypes;
      if (!params) {
        return;
      }
      if (params.length !== command.MoveCall.arguments.length) {
        throw new Error(`Incorrect number of arguments for ${fnName}`);
      }
      params.forEach((param, i) => {
        const arg = moveCall.arguments[i];
        if (arg.$kind !== "Input") return;
        const input = inputs[arg.Input];
        if (!input.UnresolvedPure && !input.UnresolvedObject) {
          return;
        }
        const inputValue = input.UnresolvedPure?.value ?? input.UnresolvedObject?.objectId;
        const schema = getPureBcsSchema(param.body);
        if (schema) {
          arg.type = "pure";
          inputs[inputs.indexOf(input)] = Inputs.Pure(schema.serialize(inputValue));
          return;
        }
        if (typeof inputValue !== "string") {
          throw new Error(
            `Expect the argument to be an object id string, got ${JSON.stringify(
              inputValue,
              null,
              2
            )}`
          );
        }
        arg.type = "object";
        const unresolvedObject = input.UnresolvedPure ? {
          $kind: "UnresolvedObject",
          UnresolvedObject: {
            objectId: inputValue
          }
        } : input;
        inputs[arg.Input] = unresolvedObject;
      });
    });
  }
  function validate(transactionData) {
    transactionData.inputs.forEach((input, index) => {
      if (input.$kind !== "Object" && input.$kind !== "Pure") {
        throw new Error(
          `Input at index ${index} has not been resolved.  Expected a Pure or Object input, but found ${JSON.stringify(
            input
          )}`
        );
      }
    });
  }
  function normalizeRawArgument(arg, schema, transactionData) {
    if (arg.$kind !== "Input") {
      return;
    }
    const input = transactionData.inputs[arg.Input];
    if (input.$kind !== "UnresolvedPure") {
      return;
    }
    transactionData.inputs[arg.Input] = Inputs.Pure(schema.serialize(input.UnresolvedPure.value));
  }
  function isUsedAsMutable(transactionData, index) {
    let usedAsMutable = false;
    transactionData.getInputUses(index, (arg, tx) => {
      if (tx.MoveCall && tx.MoveCall._argumentTypes) {
        const argIndex = tx.MoveCall.arguments.indexOf(arg);
        usedAsMutable = tx.MoveCall._argumentTypes[argIndex].ref !== "&" || usedAsMutable;
      }
      if (tx.$kind === "MakeMoveVec" || tx.$kind === "MergeCoins" || tx.$kind === "SplitCoins") {
        usedAsMutable = true;
      }
    });
    return usedAsMutable;
  }
  function isUsedAsReceiving(transactionData, index) {
    let usedAsReceiving = false;
    transactionData.getInputUses(index, (arg, tx) => {
      if (tx.MoveCall && tx.MoveCall._argumentTypes) {
        const argIndex = tx.MoveCall.arguments.indexOf(arg);
        usedAsReceiving = isReceivingType(tx.MoveCall._argumentTypes[argIndex]) || usedAsReceiving;
      }
    });
    return usedAsReceiving;
  }
  function isReceivingType(type) {
    if (typeof type.body !== "object" || !("datatype" in type.body)) {
      return false;
    }
    return type.body.datatype.package === "0x2" && type.body.datatype.module === "transfer" && type.body.datatype.type === "Receiving";
  }
  function getClient(options) {
    if (!options.client) {
      throw new Error(
        `No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`
      );
    }
    return options.client;
  }
  function chunk(arr, size) {
    return Array.from(
      { length: Math.ceil(arr.length / size) },
      (_, i) => arr.slice(i * size, i * size + size)
    );
  }

  // node_modules/@mysten/sui/dist/esm/transactions/object.js
  function createObjectMethods(makeObject) {
    function object2(value) {
      return makeObject(value);
    }
    object2.system = () => object2("0x5");
    object2.clock = () => object2("0x6");
    object2.random = () => object2("0x8");
    object2.denyList = () => object2("0x403");
    object2.option = ({ type, value }) => (tx) => tx.moveCall({
      typeArguments: [type],
      target: `0x1::option::${value === null ? "none" : "some"}`,
      arguments: value === null ? [] : [tx.object(value)]
    });
    return object2;
  }

  // node_modules/@mysten/sui/dist/esm/transactions/pure.js
  function createPure(makePure) {
    function pure(typeOrSerializedValue, value) {
      if (typeof typeOrSerializedValue === "string") {
        return makePure(pureBcsSchemaFromTypeName(typeOrSerializedValue).serialize(value));
      }
      if (typeOrSerializedValue instanceof Uint8Array || isSerializedBcs(typeOrSerializedValue)) {
        return makePure(typeOrSerializedValue);
      }
      throw new Error("tx.pure must be called either a bcs type name, or a serialized bcs value");
    }
    pure.u8 = (value) => makePure(suiBcs.U8.serialize(value));
    pure.u16 = (value) => makePure(suiBcs.U16.serialize(value));
    pure.u32 = (value) => makePure(suiBcs.U32.serialize(value));
    pure.u64 = (value) => makePure(suiBcs.U64.serialize(value));
    pure.u128 = (value) => makePure(suiBcs.U128.serialize(value));
    pure.u256 = (value) => makePure(suiBcs.U256.serialize(value));
    pure.bool = (value) => makePure(suiBcs.Bool.serialize(value));
    pure.string = (value) => makePure(suiBcs.String.serialize(value));
    pure.address = (value) => makePure(suiBcs.Address.serialize(value));
    pure.id = pure.address;
    pure.vector = (type, value) => {
      return makePure(
        suiBcs.vector(pureBcsSchemaFromTypeName(type)).serialize(value)
      );
    };
    pure.option = (type, value) => {
      return makePure(suiBcs.option(pureBcsSchemaFromTypeName(type)).serialize(value));
    };
    return pure;
  }

  // node_modules/@mysten/sui/dist/esm/transactions/hash.js
  function hashTypedData(typeTag, data) {
    const typeTagBytes = Array.from(`${typeTag}::`).map((e) => e.charCodeAt(0));
    const dataWithTag = new Uint8Array(typeTagBytes.length + data.length);
    dataWithTag.set(typeTagBytes);
    dataWithTag.set(data, typeTagBytes.length);
    return blake2b2(dataWithTag, { dkLen: 32 });
  }

  // node_modules/@mysten/sui/dist/esm/transactions/TransactionData.js
  function prepareSuiAddress(address) {
    return normalizeSuiAddress(address).replace("0x", "");
  }
  var TransactionDataBuilder = class _TransactionDataBuilder {
    constructor(clone) {
      this.version = 2;
      this.sender = clone?.sender ?? null;
      this.expiration = clone?.expiration ?? null;
      this.inputs = clone?.inputs ?? [];
      this.commands = clone?.commands ?? [];
      this.gasData = clone?.gasData ?? {
        budget: null,
        price: null,
        owner: null,
        payment: null
      };
    }
    static fromKindBytes(bytes) {
      const kind = suiBcs.TransactionKind.parse(bytes);
      const programmableTx = kind.ProgrammableTransaction;
      if (!programmableTx) {
        throw new Error("Unable to deserialize from bytes.");
      }
      return _TransactionDataBuilder.restore({
        version: 2,
        sender: null,
        expiration: null,
        gasData: {
          budget: null,
          owner: null,
          payment: null,
          price: null
        },
        inputs: programmableTx.inputs,
        commands: programmableTx.commands
      });
    }
    static fromBytes(bytes) {
      const rawData = suiBcs.TransactionData.parse(bytes);
      const data = rawData?.V1;
      const programmableTx = data.kind.ProgrammableTransaction;
      if (!data || !programmableTx) {
        throw new Error("Unable to deserialize from bytes.");
      }
      return _TransactionDataBuilder.restore({
        version: 2,
        sender: data.sender,
        expiration: data.expiration,
        gasData: data.gasData,
        inputs: programmableTx.inputs,
        commands: programmableTx.commands
      });
    }
    static restore(data) {
      if (data.version === 2) {
        return new _TransactionDataBuilder(parse(TransactionData2, data));
      } else {
        return new _TransactionDataBuilder(parse(TransactionData2, transactionDataFromV1(data)));
      }
    }
    /**
     * Generate transaction digest.
     *
     * @param bytes BCS serialized transaction data
     * @returns transaction digest.
     */
    static getDigestFromBytes(bytes) {
      const hash = hashTypedData("TransactionData", bytes);
      return toBase58(hash);
    }
    // @deprecated use gasData instead
    get gasConfig() {
      return this.gasData;
    }
    // @deprecated use gasData instead
    set gasConfig(value) {
      this.gasData = value;
    }
    build({
      maxSizeBytes = Infinity,
      overrides,
      onlyTransactionKind
    } = {}) {
      const inputs = this.inputs;
      const commands = this.commands;
      const kind = {
        ProgrammableTransaction: {
          inputs,
          commands
        }
      };
      if (onlyTransactionKind) {
        return suiBcs.TransactionKind.serialize(kind, { maxSize: maxSizeBytes }).toBytes();
      }
      const expiration = overrides?.expiration ?? this.expiration;
      const sender = overrides?.sender ?? this.sender;
      const gasData = { ...this.gasData, ...overrides?.gasConfig, ...overrides?.gasData };
      if (!sender) {
        throw new Error("Missing transaction sender");
      }
      if (!gasData.budget) {
        throw new Error("Missing gas budget");
      }
      if (!gasData.payment) {
        throw new Error("Missing gas payment");
      }
      if (!gasData.price) {
        throw new Error("Missing gas price");
      }
      const transactionData = {
        sender: prepareSuiAddress(sender),
        expiration: expiration ? expiration : { None: true },
        gasData: {
          payment: gasData.payment,
          owner: prepareSuiAddress(this.gasData.owner ?? sender),
          price: BigInt(gasData.price),
          budget: BigInt(gasData.budget)
        },
        kind: {
          ProgrammableTransaction: {
            inputs,
            commands
          }
        }
      };
      return suiBcs.TransactionData.serialize(
        { V1: transactionData },
        { maxSize: maxSizeBytes }
      ).toBytes();
    }
    addInput(type, arg) {
      const index = this.inputs.length;
      this.inputs.push(arg);
      return { Input: index, type, $kind: "Input" };
    }
    getInputUses(index, fn) {
      this.mapArguments((arg, command) => {
        if (arg.$kind === "Input" && arg.Input === index) {
          fn(arg, command);
        }
        return arg;
      });
    }
    mapArguments(fn) {
      for (const command of this.commands) {
        switch (command.$kind) {
          case "MoveCall":
            command.MoveCall.arguments = command.MoveCall.arguments.map((arg) => fn(arg, command));
            break;
          case "TransferObjects":
            command.TransferObjects.objects = command.TransferObjects.objects.map(
              (arg) => fn(arg, command)
            );
            command.TransferObjects.address = fn(command.TransferObjects.address, command);
            break;
          case "SplitCoins":
            command.SplitCoins.coin = fn(command.SplitCoins.coin, command);
            command.SplitCoins.amounts = command.SplitCoins.amounts.map((arg) => fn(arg, command));
            break;
          case "MergeCoins":
            command.MergeCoins.destination = fn(command.MergeCoins.destination, command);
            command.MergeCoins.sources = command.MergeCoins.sources.map((arg) => fn(arg, command));
            break;
          case "MakeMoveVec":
            command.MakeMoveVec.elements = command.MakeMoveVec.elements.map(
              (arg) => fn(arg, command)
            );
            break;
          case "Upgrade":
            command.Upgrade.ticket = fn(command.Upgrade.ticket, command);
            break;
          case "$Intent":
            const inputs = command.$Intent.inputs;
            command.$Intent.inputs = {};
            for (const [key, value] of Object.entries(inputs)) {
              command.$Intent.inputs[key] = Array.isArray(value) ? value.map((arg) => fn(arg, command)) : fn(value, command);
            }
            break;
          case "Publish":
            break;
          default:
            throw new Error(`Unexpected transaction kind: ${command.$kind}`);
        }
      }
    }
    replaceCommand(index, replacement) {
      if (!Array.isArray(replacement)) {
        this.commands[index] = replacement;
        return;
      }
      const sizeDiff = replacement.length - 1;
      this.commands.splice(index, 1, ...replacement);
      if (sizeDiff !== 0) {
        this.mapArguments((arg) => {
          switch (arg.$kind) {
            case "Result":
              if (arg.Result > index) {
                arg.Result += sizeDiff;
              }
              break;
            case "NestedResult":
              if (arg.NestedResult[0] > index) {
                arg.NestedResult[0] += sizeDiff;
              }
              break;
          }
          return arg;
        });
      }
    }
    getDigest() {
      const bytes = this.build({ onlyTransactionKind: false });
      return _TransactionDataBuilder.getDigestFromBytes(bytes);
    }
    snapshot() {
      return parse(TransactionData2, this);
    }
  };

  // node_modules/@mysten/sui/dist/esm/transactions/utils.js
  function getIdFromCallArg(arg) {
    if (typeof arg === "string") {
      return normalizeSuiAddress(arg);
    }
    if (arg.Object) {
      if (arg.Object.ImmOrOwnedObject) {
        return normalizeSuiAddress(arg.Object.ImmOrOwnedObject.objectId);
      }
      if (arg.Object.Receiving) {
        return normalizeSuiAddress(arg.Object.Receiving.objectId);
      }
      return normalizeSuiAddress(arg.Object.SharedObject.objectId);
    }
    if (arg.UnresolvedObject) {
      return normalizeSuiAddress(arg.UnresolvedObject.objectId);
    }
    return void 0;
  }

  // node_modules/@mysten/sui/dist/esm/transactions/Transaction.js
  var __typeError4 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck4 = (obj, member, msg) => member.has(obj) || __typeError4("Cannot " + msg);
  var __privateGet4 = (obj, member, getter) => (__accessCheck4(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd4 = (obj, member, value) => member.has(obj) ? __typeError4("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet4 = (obj, member, value, setter) => (__accessCheck4(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod3 = (obj, member, method) => (__accessCheck4(obj, member, "access private method"), method);
  var _serializationPlugins;
  var _buildPlugins;
  var _intentResolvers;
  var _data;
  var _Transaction_instances;
  var normalizeTransactionArgument_fn;
  var resolveArgument_fn;
  var prepareBuild_fn;
  var runPlugins_fn;
  function createTransactionResult(index, length = Infinity) {
    const baseResult = { $kind: "Result", Result: index };
    const nestedResults = [];
    const nestedResultFor = (resultIndex) => nestedResults[resultIndex] ?? (nestedResults[resultIndex] = {
      $kind: "NestedResult",
      NestedResult: [index, resultIndex]
    });
    return new Proxy(baseResult, {
      set() {
        throw new Error(
          "The transaction result is a proxy, and does not support setting properties directly"
        );
      },
      // TODO: Instead of making this return a concrete argument, we should ideally
      // make it reference-based (so that this gets resolved at build-time), which
      // allows re-ordering transactions.
      get(target, property) {
        if (property in target) {
          return Reflect.get(target, property);
        }
        if (property === Symbol.iterator) {
          return function* () {
            let i = 0;
            while (i < length) {
              yield nestedResultFor(i);
              i++;
            }
          };
        }
        if (typeof property === "symbol") return;
        const resultIndex = parseInt(property, 10);
        if (Number.isNaN(resultIndex) || resultIndex < 0) return;
        return nestedResultFor(resultIndex);
      }
    });
  }
  var TRANSACTION_BRAND = Symbol.for("@mysten/transaction");
  function isTransaction(obj) {
    return !!obj && typeof obj === "object" && obj[TRANSACTION_BRAND] === true;
  }
  var modulePluginRegistry = {
    buildPlugins: /* @__PURE__ */ new Map(),
    serializationPlugins: /* @__PURE__ */ new Map()
  };
  var TRANSACTION_REGISTRY_KEY = Symbol.for("@mysten/transaction/registry");
  function getGlobalPluginRegistry() {
    try {
      const target = globalThis;
      if (!target[TRANSACTION_REGISTRY_KEY]) {
        target[TRANSACTION_REGISTRY_KEY] = modulePluginRegistry;
      }
      return target[TRANSACTION_REGISTRY_KEY];
    } catch (e) {
      return modulePluginRegistry;
    }
  }
  var _Transaction = class _Transaction2 {
    constructor() {
      __privateAdd4(this, _Transaction_instances);
      __privateAdd4(this, _serializationPlugins);
      __privateAdd4(this, _buildPlugins);
      __privateAdd4(this, _intentResolvers, /* @__PURE__ */ new Map());
      __privateAdd4(this, _data);
      this.object = createObjectMethods(
        (value) => {
          if (typeof value === "function") {
            return this.object(value(this));
          }
          if (typeof value === "object" && is(Argument2, value)) {
            return value;
          }
          const id = getIdFromCallArg(value);
          const inserted = __privateGet4(this, _data).inputs.find((i) => id === getIdFromCallArg(i));
          if (inserted?.Object?.SharedObject && typeof value === "object" && value.Object?.SharedObject) {
            inserted.Object.SharedObject.mutable = inserted.Object.SharedObject.mutable || value.Object.SharedObject.mutable;
          }
          return inserted ? { $kind: "Input", Input: __privateGet4(this, _data).inputs.indexOf(inserted), type: "object" } : __privateGet4(this, _data).addInput(
            "object",
            typeof value === "string" ? {
              $kind: "UnresolvedObject",
              UnresolvedObject: { objectId: normalizeSuiAddress(value) }
            } : value
          );
        }
      );
      const globalPlugins = getGlobalPluginRegistry();
      __privateSet4(this, _data, new TransactionDataBuilder());
      __privateSet4(this, _buildPlugins, [...globalPlugins.buildPlugins.values()]);
      __privateSet4(this, _serializationPlugins, [...globalPlugins.serializationPlugins.values()]);
    }
    /**
     * Converts from a serialize transaction kind (built with `build({ onlyTransactionKind: true })`) to a `Transaction` class.
     * Supports either a byte array, or base64-encoded bytes.
     */
    static fromKind(serialized) {
      const tx = new _Transaction2();
      __privateSet4(tx, _data, TransactionDataBuilder.fromKindBytes(
        typeof serialized === "string" ? fromBase64(serialized) : serialized
      ));
      return tx;
    }
    /**
     * Converts from a serialized transaction format to a `Transaction` class.
     * There are two supported serialized formats:
     * - A string returned from `Transaction#serialize`. The serialized format must be compatible, or it will throw an error.
     * - A byte array (or base64-encoded bytes) containing BCS transaction data.
     */
    static from(transaction) {
      const newTransaction = new _Transaction2();
      if (isTransaction(transaction)) {
        __privateSet4(newTransaction, _data, new TransactionDataBuilder(transaction.getData()));
      } else if (typeof transaction !== "string" || !transaction.startsWith("{")) {
        __privateSet4(newTransaction, _data, TransactionDataBuilder.fromBytes(
          typeof transaction === "string" ? fromBase64(transaction) : transaction
        ));
      } else {
        __privateSet4(newTransaction, _data, TransactionDataBuilder.restore(JSON.parse(transaction)));
      }
      return newTransaction;
    }
    static registerGlobalSerializationPlugin(stepOrStep, step) {
      getGlobalPluginRegistry().serializationPlugins.set(
        stepOrStep,
        step ?? stepOrStep
      );
    }
    static unregisterGlobalSerializationPlugin(name) {
      getGlobalPluginRegistry().serializationPlugins.delete(name);
    }
    static registerGlobalBuildPlugin(stepOrStep, step) {
      getGlobalPluginRegistry().buildPlugins.set(
        stepOrStep,
        step ?? stepOrStep
      );
    }
    static unregisterGlobalBuildPlugin(name) {
      getGlobalPluginRegistry().buildPlugins.delete(name);
    }
    addSerializationPlugin(step) {
      __privateGet4(this, _serializationPlugins).push(step);
    }
    addBuildPlugin(step) {
      __privateGet4(this, _buildPlugins).push(step);
    }
    addIntentResolver(intent, resolver) {
      if (__privateGet4(this, _intentResolvers).has(intent) && __privateGet4(this, _intentResolvers).get(intent) !== resolver) {
        throw new Error(`Intent resolver for ${intent} already exists`);
      }
      __privateGet4(this, _intentResolvers).set(intent, resolver);
    }
    setSender(sender) {
      __privateGet4(this, _data).sender = sender;
    }
    /**
     * Sets the sender only if it has not already been set.
     * This is useful for sponsored transaction flows where the sender may not be the same as the signer address.
     */
    setSenderIfNotSet(sender) {
      if (!__privateGet4(this, _data).sender) {
        __privateGet4(this, _data).sender = sender;
      }
    }
    setExpiration(expiration) {
      __privateGet4(this, _data).expiration = expiration ? parse(TransactionExpiration2, expiration) : null;
    }
    setGasPrice(price) {
      __privateGet4(this, _data).gasConfig.price = String(price);
    }
    setGasBudget(budget) {
      __privateGet4(this, _data).gasConfig.budget = String(budget);
    }
    setGasBudgetIfNotSet(budget) {
      if (__privateGet4(this, _data).gasData.budget == null) {
        __privateGet4(this, _data).gasConfig.budget = String(budget);
      }
    }
    setGasOwner(owner) {
      __privateGet4(this, _data).gasConfig.owner = owner;
    }
    setGasPayment(payments) {
      __privateGet4(this, _data).gasConfig.payment = payments.map((payment) => parse(ObjectRef, payment));
    }
    /** @deprecated Use `getData()` instead. */
    get blockData() {
      return serializeV1TransactionData(__privateGet4(this, _data).snapshot());
    }
    /** Get a snapshot of the transaction data, in JSON form: */
    getData() {
      return __privateGet4(this, _data).snapshot();
    }
    // Used to brand transaction classes so that they can be identified, even between multiple copies
    // of the builder.
    get [TRANSACTION_BRAND]() {
      return true;
    }
    // Temporary workaround for the wallet interface accidentally serializing transactions via postMessage
    get pure() {
      Object.defineProperty(this, "pure", {
        enumerable: false,
        value: createPure((value) => {
          if (isSerializedBcs(value)) {
            return __privateGet4(this, _data).addInput("pure", {
              $kind: "Pure",
              Pure: {
                bytes: value.toBase64()
              }
            });
          }
          return __privateGet4(this, _data).addInput(
            "pure",
            is(NormalizedCallArg, value) ? parse(NormalizedCallArg, value) : value instanceof Uint8Array ? Inputs.Pure(value) : { $kind: "UnresolvedPure", UnresolvedPure: { value } }
          );
        })
      });
      return this.pure;
    }
    /** Returns an argument for the gas coin, to be used in a transaction. */
    get gas() {
      return { $kind: "GasCoin", GasCoin: true };
    }
    /**
     * Add a new object input to the transaction using the fully-resolved object reference.
     * If you only have an object ID, use `builder.object(id)` instead.
     */
    objectRef(...args) {
      return this.object(Inputs.ObjectRef(...args));
    }
    /**
     * Add a new receiving input to the transaction using the fully-resolved object reference.
     * If you only have an object ID, use `builder.object(id)` instead.
     */
    receivingRef(...args) {
      return this.object(Inputs.ReceivingRef(...args));
    }
    /**
     * Add a new shared object input to the transaction using the fully-resolved shared object reference.
     * If you only have an object ID, use `builder.object(id)` instead.
     */
    sharedObjectRef(...args) {
      return this.object(Inputs.SharedObjectRef(...args));
    }
    /** Add a transaction to the transaction */
    add(command) {
      if (typeof command === "function") {
        return command(this);
      }
      const index = __privateGet4(this, _data).commands.push(command);
      return createTransactionResult(index - 1);
    }
    // Method shorthands:
    splitCoins(coin, amounts) {
      const command = Commands.SplitCoins(
        typeof coin === "string" ? this.object(coin) : __privateMethod3(this, _Transaction_instances, resolveArgument_fn).call(this, coin),
        amounts.map(
          (amount) => typeof amount === "number" || typeof amount === "bigint" || typeof amount === "string" ? this.pure.u64(amount) : __privateMethod3(this, _Transaction_instances, normalizeTransactionArgument_fn).call(this, amount)
        )
      );
      const index = __privateGet4(this, _data).commands.push(command);
      return createTransactionResult(index - 1, amounts.length);
    }
    mergeCoins(destination, sources) {
      return this.add(
        Commands.MergeCoins(
          this.object(destination),
          sources.map((src) => this.object(src))
        )
      );
    }
    publish({ modules, dependencies }) {
      return this.add(
        Commands.Publish({
          modules,
          dependencies
        })
      );
    }
    upgrade({
      modules,
      dependencies,
      package: packageId,
      ticket
    }) {
      return this.add(
        Commands.Upgrade({
          modules,
          dependencies,
          package: packageId,
          ticket: this.object(ticket)
        })
      );
    }
    moveCall({
      arguments: args,
      ...input
    }) {
      return this.add(
        Commands.MoveCall({
          ...input,
          arguments: args?.map((arg) => __privateMethod3(this, _Transaction_instances, normalizeTransactionArgument_fn).call(this, arg))
        })
      );
    }
    transferObjects(objects, address) {
      return this.add(
        Commands.TransferObjects(
          objects.map((obj) => this.object(obj)),
          typeof address === "string" ? this.pure.address(address) : __privateMethod3(this, _Transaction_instances, normalizeTransactionArgument_fn).call(this, address)
        )
      );
    }
    makeMoveVec({
      type,
      elements
    }) {
      return this.add(
        Commands.MakeMoveVec({
          type,
          elements: elements.map((obj) => this.object(obj))
        })
      );
    }
    /**
     * @deprecated Use toJSON instead.
     * For synchronous serialization, you can use `getData()`
     * */
    serialize() {
      return JSON.stringify(serializeV1TransactionData(__privateGet4(this, _data).snapshot()));
    }
    async toJSON(options = {}) {
      await this.prepareForSerialization(options);
      return JSON.stringify(
        parse(SerializedTransactionDataV2, __privateGet4(this, _data).snapshot()),
        (_key, value) => typeof value === "bigint" ? value.toString() : value,
        2
      );
    }
    /** Build the transaction to BCS bytes, and sign it with the provided keypair. */
    async sign(options) {
      const { signer, ...buildOptions } = options;
      const bytes = await this.build(buildOptions);
      return signer.signTransaction(bytes);
    }
    /** Build the transaction to BCS bytes. */
    async build(options = {}) {
      await this.prepareForSerialization(options);
      await __privateMethod3(this, _Transaction_instances, prepareBuild_fn).call(this, options);
      return __privateGet4(this, _data).build({
        onlyTransactionKind: options.onlyTransactionKind
      });
    }
    /** Derive transaction digest */
    async getDigest(options = {}) {
      await __privateMethod3(this, _Transaction_instances, prepareBuild_fn).call(this, options);
      return __privateGet4(this, _data).getDigest();
    }
    async prepareForSerialization(options) {
      const intents = /* @__PURE__ */ new Set();
      for (const command of __privateGet4(this, _data).commands) {
        if (command.$Intent) {
          intents.add(command.$Intent.name);
        }
      }
      const steps = [...__privateGet4(this, _serializationPlugins)];
      for (const intent of intents) {
        if (options.supportedIntents?.includes(intent)) {
          continue;
        }
        if (!__privateGet4(this, _intentResolvers).has(intent)) {
          throw new Error(`Missing intent resolver for ${intent}`);
        }
        steps.push(__privateGet4(this, _intentResolvers).get(intent));
      }
      await __privateMethod3(this, _Transaction_instances, runPlugins_fn).call(this, steps, options);
    }
  };
  _serializationPlugins = /* @__PURE__ */ new WeakMap();
  _buildPlugins = /* @__PURE__ */ new WeakMap();
  _intentResolvers = /* @__PURE__ */ new WeakMap();
  _data = /* @__PURE__ */ new WeakMap();
  _Transaction_instances = /* @__PURE__ */ new WeakSet();
  normalizeTransactionArgument_fn = function(arg) {
    if (isSerializedBcs(arg)) {
      return this.pure(arg);
    }
    return __privateMethod3(this, _Transaction_instances, resolveArgument_fn).call(this, arg);
  };
  resolveArgument_fn = function(arg) {
    if (typeof arg === "function") {
      return parse(Argument2, arg(this));
    }
    return parse(Argument2, arg);
  };
  prepareBuild_fn = async function(options) {
    if (!options.onlyTransactionKind && !__privateGet4(this, _data).sender) {
      throw new Error("Missing transaction sender");
    }
    await __privateMethod3(this, _Transaction_instances, runPlugins_fn).call(this, [...__privateGet4(this, _buildPlugins), resolveTransactionData], options);
  };
  runPlugins_fn = async function(plugins, options) {
    const createNext = (i) => {
      if (i >= plugins.length) {
        return () => {
        };
      }
      const plugin = plugins[i];
      return async () => {
        const next = createNext(i + 1);
        let calledNext = false;
        let nextResolved = false;
        await plugin(__privateGet4(this, _data), options, async () => {
          if (calledNext) {
            throw new Error(`next() was call multiple times in TransactionPlugin ${i}`);
          }
          calledNext = true;
          await next();
          nextResolved = true;
        });
        if (!calledNext) {
          throw new Error(`next() was not called in TransactionPlugin ${i}`);
        }
        if (!nextResolved) {
          throw new Error(`next() was not awaited in TransactionPlugin ${i}`);
        }
      };
    };
    await createNext(0)();
  };
  var Transaction = _Transaction;

  // node_modules/@mysten/sui/dist/esm/client/client.js
  var SUI_CLIENT_BRAND = Symbol.for("@mysten/SuiClient");
  var SuiClient = class {
    get [SUI_CLIENT_BRAND]() {
      return true;
    }
    /**
     * Establish a connection to a Sui RPC endpoint
     *
     * @param options configuration options for the API Client
     */
    constructor(options) {
      this.transport = options.transport ?? new SuiHTTPTransport({ url: options.url });
    }
    async getRpcApiVersion() {
      const resp = await this.transport.request({
        method: "rpc.discover",
        params: []
      });
      return resp.info.version;
    }
    /**
     * Get all Coin<`coin_type`> objects owned by an address.
     */
    async getCoins(input) {
      if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
        throw new Error("Invalid Sui address");
      }
      return await this.transport.request({
        method: "suix_getCoins",
        params: [input.owner, input.coinType, input.cursor, input.limit]
      });
    }
    /**
     * Get all Coin objects owned by an address.
     */
    async getAllCoins(input) {
      if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
        throw new Error("Invalid Sui address");
      }
      return await this.transport.request({
        method: "suix_getAllCoins",
        params: [input.owner, input.cursor, input.limit]
      });
    }
    /**
     * Get the total coin balance for one coin type, owned by the address owner.
     */
    async getBalance(input) {
      if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
        throw new Error("Invalid Sui address");
      }
      return await this.transport.request({
        method: "suix_getBalance",
        params: [input.owner, input.coinType]
      });
    }
    /**
     * Get the total coin balance for all coin types, owned by the address owner.
     */
    async getAllBalances(input) {
      if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
        throw new Error("Invalid Sui address");
      }
      return await this.transport.request({ method: "suix_getAllBalances", params: [input.owner] });
    }
    /**
     * Fetch CoinMetadata for a given coin type
     */
    async getCoinMetadata(input) {
      return await this.transport.request({
        method: "suix_getCoinMetadata",
        params: [input.coinType]
      });
    }
    /**
     *  Fetch total supply for a coin
     */
    async getTotalSupply(input) {
      return await this.transport.request({
        method: "suix_getTotalSupply",
        params: [input.coinType]
      });
    }
    /**
     * Invoke any RPC method
     * @param method the method to be invoked
     * @param args the arguments to be passed to the RPC request
     */
    async call(method, params) {
      return await this.transport.request({ method, params });
    }
    /**
     * Get Move function argument types like read, write and full access
     */
    async getMoveFunctionArgTypes(input) {
      return await this.transport.request({
        method: "sui_getMoveFunctionArgTypes",
        params: [input.package, input.module, input.function]
      });
    }
    /**
     * Get a map from module name to
     * structured representations of Move modules
     */
    async getNormalizedMoveModulesByPackage(input) {
      return await this.transport.request({
        method: "sui_getNormalizedMoveModulesByPackage",
        params: [input.package]
      });
    }
    /**
     * Get a structured representation of Move module
     */
    async getNormalizedMoveModule(input) {
      return await this.transport.request({
        method: "sui_getNormalizedMoveModule",
        params: [input.package, input.module]
      });
    }
    /**
     * Get a structured representation of Move function
     */
    async getNormalizedMoveFunction(input) {
      return await this.transport.request({
        method: "sui_getNormalizedMoveFunction",
        params: [input.package, input.module, input.function]
      });
    }
    /**
     * Get a structured representation of Move struct
     */
    async getNormalizedMoveStruct(input) {
      return await this.transport.request({
        method: "sui_getNormalizedMoveStruct",
        params: [input.package, input.module, input.struct]
      });
    }
    /**
     * Get all objects owned by an address
     */
    async getOwnedObjects(input) {
      if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
        throw new Error("Invalid Sui address");
      }
      return await this.transport.request({
        method: "suix_getOwnedObjects",
        params: [
          input.owner,
          {
            filter: input.filter,
            options: input.options
          },
          input.cursor,
          input.limit
        ]
      });
    }
    /**
     * Get details about an object
     */
    async getObject(input) {
      if (!input.id || !isValidSuiObjectId(normalizeSuiObjectId(input.id))) {
        throw new Error("Invalid Sui Object id");
      }
      return await this.transport.request({
        method: "sui_getObject",
        params: [input.id, input.options]
      });
    }
    async tryGetPastObject(input) {
      return await this.transport.request({
        method: "sui_tryGetPastObject",
        params: [input.id, input.version, input.options]
      });
    }
    /**
     * Batch get details about a list of objects. If any of the object ids are duplicates the call will fail
     */
    async multiGetObjects(input) {
      input.ids.forEach((id) => {
        if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) {
          throw new Error(`Invalid Sui Object id ${id}`);
        }
      });
      const hasDuplicates = input.ids.length !== new Set(input.ids).size;
      if (hasDuplicates) {
        throw new Error(`Duplicate object ids in batch call ${input.ids}`);
      }
      return await this.transport.request({
        method: "sui_multiGetObjects",
        params: [input.ids, input.options]
      });
    }
    /**
     * Get transaction blocks for a given query criteria
     */
    async queryTransactionBlocks(input) {
      return await this.transport.request({
        method: "suix_queryTransactionBlocks",
        params: [
          {
            filter: input.filter,
            options: input.options
          },
          input.cursor,
          input.limit,
          (input.order || "descending") === "descending"
        ]
      });
    }
    async getTransactionBlock(input) {
      if (!isValidTransactionDigest(input.digest)) {
        throw new Error("Invalid Transaction digest");
      }
      return await this.transport.request({
        method: "sui_getTransactionBlock",
        params: [input.digest, input.options]
      });
    }
    async multiGetTransactionBlocks(input) {
      input.digests.forEach((d) => {
        if (!isValidTransactionDigest(d)) {
          throw new Error(`Invalid Transaction digest ${d}`);
        }
      });
      const hasDuplicates = input.digests.length !== new Set(input.digests).size;
      if (hasDuplicates) {
        throw new Error(`Duplicate digests in batch call ${input.digests}`);
      }
      return await this.transport.request({
        method: "sui_multiGetTransactionBlocks",
        params: [input.digests, input.options]
      });
    }
    async executeTransactionBlock({
      transactionBlock,
      signature,
      options,
      requestType
    }) {
      const result = await this.transport.request({
        method: "sui_executeTransactionBlock",
        params: [
          typeof transactionBlock === "string" ? transactionBlock : toBase64(transactionBlock),
          Array.isArray(signature) ? signature : [signature],
          options
        ]
      });
      if (requestType === "WaitForLocalExecution") {
        try {
          await this.waitForTransaction({
            digest: result.digest
          });
        } catch (_) {
        }
      }
      return result;
    }
    async signAndExecuteTransaction({
      transaction,
      signer,
      ...input
    }) {
      let transactionBytes;
      if (transaction instanceof Uint8Array) {
        transactionBytes = transaction;
      } else {
        transaction.setSenderIfNotSet(signer.toSuiAddress());
        transactionBytes = await transaction.build({ client: this });
      }
      const { signature, bytes } = await signer.signTransaction(transactionBytes);
      return this.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        ...input
      });
    }
    /**
     * Get total number of transactions
     */
    async getTotalTransactionBlocks() {
      const resp = await this.transport.request({
        method: "sui_getTotalTransactionBlocks",
        params: []
      });
      return BigInt(resp);
    }
    /**
     * Getting the reference gas price for the network
     */
    async getReferenceGasPrice() {
      const resp = await this.transport.request({
        method: "suix_getReferenceGasPrice",
        params: []
      });
      return BigInt(resp);
    }
    /**
     * Return the delegated stakes for an address
     */
    async getStakes(input) {
      if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
        throw new Error("Invalid Sui address");
      }
      return await this.transport.request({ method: "suix_getStakes", params: [input.owner] });
    }
    /**
     * Return the delegated stakes queried by id.
     */
    async getStakesByIds(input) {
      input.stakedSuiIds.forEach((id) => {
        if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) {
          throw new Error(`Invalid Sui Stake id ${id}`);
        }
      });
      return await this.transport.request({
        method: "suix_getStakesByIds",
        params: [input.stakedSuiIds]
      });
    }
    /**
     * Return the latest system state content.
     */
    async getLatestSuiSystemState() {
      return await this.transport.request({ method: "suix_getLatestSuiSystemState", params: [] });
    }
    /**
     * Get events for a given query criteria
     */
    async queryEvents(input) {
      return await this.transport.request({
        method: "suix_queryEvents",
        params: [
          input.query,
          input.cursor,
          input.limit,
          (input.order || "descending") === "descending"
        ]
      });
    }
    /**
     * Subscribe to get notifications whenever an event matching the filter occurs
     *
     * @deprecated
     */
    async subscribeEvent(input) {
      return this.transport.subscribe({
        method: "suix_subscribeEvent",
        unsubscribe: "suix_unsubscribeEvent",
        params: [input.filter],
        onMessage: input.onMessage
      });
    }
    /**
     * @deprecated
     */
    async subscribeTransaction(input) {
      return this.transport.subscribe({
        method: "suix_subscribeTransaction",
        unsubscribe: "suix_unsubscribeTransaction",
        params: [input.filter],
        onMessage: input.onMessage
      });
    }
    /**
     * Runs the transaction block in dev-inspect mode. Which allows for nearly any
     * transaction (or Move call) with any arguments. Detailed results are
     * provided, including both the transaction effects and any return values.
     */
    async devInspectTransactionBlock(input) {
      let devInspectTxBytes;
      if (isTransaction(input.transactionBlock)) {
        input.transactionBlock.setSenderIfNotSet(input.sender);
        devInspectTxBytes = toBase64(
          await input.transactionBlock.build({
            client: this,
            onlyTransactionKind: true
          })
        );
      } else if (typeof input.transactionBlock === "string") {
        devInspectTxBytes = input.transactionBlock;
      } else if (input.transactionBlock instanceof Uint8Array) {
        devInspectTxBytes = toBase64(input.transactionBlock);
      } else {
        throw new Error("Unknown transaction block format.");
      }
      return await this.transport.request({
        method: "sui_devInspectTransactionBlock",
        params: [input.sender, devInspectTxBytes, input.gasPrice?.toString(), input.epoch]
      });
    }
    /**
     * Dry run a transaction block and return the result.
     */
    async dryRunTransactionBlock(input) {
      return await this.transport.request({
        method: "sui_dryRunTransactionBlock",
        params: [
          typeof input.transactionBlock === "string" ? input.transactionBlock : toBase64(input.transactionBlock)
        ]
      });
    }
    /**
     * Return the list of dynamic field objects owned by an object
     */
    async getDynamicFields(input) {
      if (!input.parentId || !isValidSuiObjectId(normalizeSuiObjectId(input.parentId))) {
        throw new Error("Invalid Sui Object id");
      }
      return await this.transport.request({
        method: "suix_getDynamicFields",
        params: [input.parentId, input.cursor, input.limit]
      });
    }
    /**
     * Return the dynamic field object information for a specified object
     */
    async getDynamicFieldObject(input) {
      return await this.transport.request({
        method: "suix_getDynamicFieldObject",
        params: [input.parentId, input.name]
      });
    }
    /**
     * Get the sequence number of the latest checkpoint that has been executed
     */
    async getLatestCheckpointSequenceNumber() {
      const resp = await this.transport.request({
        method: "sui_getLatestCheckpointSequenceNumber",
        params: []
      });
      return String(resp);
    }
    /**
     * Returns information about a given checkpoint
     */
    async getCheckpoint(input) {
      return await this.transport.request({ method: "sui_getCheckpoint", params: [input.id] });
    }
    /**
     * Returns historical checkpoints paginated
     */
    async getCheckpoints(input) {
      return await this.transport.request({
        method: "sui_getCheckpoints",
        params: [input.cursor, input?.limit, input.descendingOrder]
      });
    }
    /**
     * Return the committee information for the asked epoch
     */
    async getCommitteeInfo(input) {
      return await this.transport.request({
        method: "suix_getCommitteeInfo",
        params: [input?.epoch]
      });
    }
    async getNetworkMetrics() {
      return await this.transport.request({ method: "suix_getNetworkMetrics", params: [] });
    }
    async getAddressMetrics() {
      return await this.transport.request({ method: "suix_getLatestAddressMetrics", params: [] });
    }
    async getEpochMetrics(input) {
      return await this.transport.request({
        method: "suix_getEpochMetrics",
        params: [input?.cursor, input?.limit, input?.descendingOrder]
      });
    }
    async getAllEpochAddressMetrics(input) {
      return await this.transport.request({
        method: "suix_getAllEpochAddressMetrics",
        params: [input?.descendingOrder]
      });
    }
    /**
     * Return the committee information for the asked epoch
     */
    async getEpochs(input) {
      return await this.transport.request({
        method: "suix_getEpochs",
        params: [input?.cursor, input?.limit, input?.descendingOrder]
      });
    }
    /**
     * Returns list of top move calls by usage
     */
    async getMoveCallMetrics() {
      return await this.transport.request({ method: "suix_getMoveCallMetrics", params: [] });
    }
    /**
     * Return the committee information for the asked epoch
     */
    async getCurrentEpoch() {
      return await this.transport.request({ method: "suix_getCurrentEpoch", params: [] });
    }
    /**
     * Return the Validators APYs
     */
    async getValidatorsApy() {
      return await this.transport.request({ method: "suix_getValidatorsApy", params: [] });
    }
    // TODO: Migrate this to `sui_getChainIdentifier` once it is widely available.
    async getChainIdentifier() {
      const checkpoint = await this.getCheckpoint({ id: "0" });
      const bytes = fromBase58(checkpoint.digest);
      return toHex(bytes.slice(0, 4));
    }
    async resolveNameServiceAddress(input) {
      return await this.transport.request({
        method: "suix_resolveNameServiceAddress",
        params: [input.name]
      });
    }
    async resolveNameServiceNames({
      format = "dot",
      ...input
    }) {
      const { nextCursor, hasNextPage, data } = await this.transport.request({
        method: "suix_resolveNameServiceNames",
        params: [input.address, input.cursor, input.limit]
      });
      return {
        hasNextPage,
        nextCursor,
        data: data.map((name) => normalizeSuiNSName(name, format))
      };
    }
    async getProtocolConfig(input) {
      return await this.transport.request({
        method: "sui_getProtocolConfig",
        params: [input?.version]
      });
    }
    /**
     * Wait for a transaction block result to be available over the API.
     * This can be used in conjunction with `executeTransactionBlock` to wait for the transaction to
     * be available via the API.
     * This currently polls the `getTransactionBlock` API to check for the transaction.
     */
    async waitForTransaction({
      signal,
      timeout = 60 * 1e3,
      pollInterval = 2 * 1e3,
      ...input
    }) {
      const timeoutSignal = AbortSignal.timeout(timeout);
      const timeoutPromise = new Promise((_, reject) => {
        timeoutSignal.addEventListener("abort", () => reject(timeoutSignal.reason));
      });
      timeoutPromise.catch(() => {
      });
      while (!timeoutSignal.aborted) {
        signal?.throwIfAborted();
        try {
          return await this.getTransactionBlock(input);
        } catch (e) {
          await Promise.race([
            new Promise((resolve) => setTimeout(resolve, pollInterval)),
            timeoutPromise
          ]);
        }
      }
      timeoutSignal.throwIfAborted();
      throw new Error("Unexpected error while waiting for transaction block.");
    }
  };

  // node_modules/@noble/hashes/esm/sha2.js
  var K512 = /* @__PURE__ */ (() => split([
    "0x428a2f98d728ae22",
    "0x7137449123ef65cd",
    "0xb5c0fbcfec4d3b2f",
    "0xe9b5dba58189dbbc",
    "0x3956c25bf348b538",
    "0x59f111f1b605d019",
    "0x923f82a4af194f9b",
    "0xab1c5ed5da6d8118",
    "0xd807aa98a3030242",
    "0x12835b0145706fbe",
    "0x243185be4ee4b28c",
    "0x550c7dc3d5ffb4e2",
    "0x72be5d74f27b896f",
    "0x80deb1fe3b1696b1",
    "0x9bdc06a725c71235",
    "0xc19bf174cf692694",
    "0xe49b69c19ef14ad2",
    "0xefbe4786384f25e3",
    "0x0fc19dc68b8cd5b5",
    "0x240ca1cc77ac9c65",
    "0x2de92c6f592b0275",
    "0x4a7484aa6ea6e483",
    "0x5cb0a9dcbd41fbd4",
    "0x76f988da831153b5",
    "0x983e5152ee66dfab",
    "0xa831c66d2db43210",
    "0xb00327c898fb213f",
    "0xbf597fc7beef0ee4",
    "0xc6e00bf33da88fc2",
    "0xd5a79147930aa725",
    "0x06ca6351e003826f",
    "0x142929670a0e6e70",
    "0x27b70a8546d22ffc",
    "0x2e1b21385c26c926",
    "0x4d2c6dfc5ac42aed",
    "0x53380d139d95b3df",
    "0x650a73548baf63de",
    "0x766a0abb3c77b2a8",
    "0x81c2c92e47edaee6",
    "0x92722c851482353b",
    "0xa2bfe8a14cf10364",
    "0xa81a664bbc423001",
    "0xc24b8b70d0f89791",
    "0xc76c51a30654be30",
    "0xd192e819d6ef5218",
    "0xd69906245565a910",
    "0xf40e35855771202a",
    "0x106aa07032bbd1b8",
    "0x19a4c116b8d2d0c8",
    "0x1e376c085141ab53",
    "0x2748774cdf8eeb99",
    "0x34b0bcb5e19b48a8",
    "0x391c0cb3c5c95a63",
    "0x4ed8aa4ae3418acb",
    "0x5b9cca4f7763e373",
    "0x682e6ff3d6b2b8a3",
    "0x748f82ee5defb2fc",
    "0x78a5636f43172f60",
    "0x84c87814a1f0ab72",
    "0x8cc702081a6439ec",
    "0x90befffa23631e28",
    "0xa4506cebde82bde9",
    "0xbef9a3f7b2c67915",
    "0xc67178f2e372532b",
    "0xca273eceea26619c",
    "0xd186b8c721c0c207",
    "0xeada7dd6cde0eb1e",
    "0xf57d4f7fee6ed178",
    "0x06f067aa72176fba",
    "0x0a637dc5a2c898a6",
    "0x113f9804bef90dae",
    "0x1b710b35131c471b",
    "0x28db77f523047d84",
    "0x32caab7b40c72493",
    "0x3c9ebe0a15c9bebc",
    "0x431d67c49c100d4c",
    "0x4cc5d4becb3e42b6",
    "0x597f299cfc657e2a",
    "0x5fcb6fab3ad6faec",
    "0x6c44198c4a475817"
  ].map((n) => BigInt(n))))();
  var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
  var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
  var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
  var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
  var SHA512 = class extends HashMD {
    constructor(outputLen = 64) {
      super(128, outputLen, 16, false);
      this.Ah = SHA512_IV[0] | 0;
      this.Al = SHA512_IV[1] | 0;
      this.Bh = SHA512_IV[2] | 0;
      this.Bl = SHA512_IV[3] | 0;
      this.Ch = SHA512_IV[4] | 0;
      this.Cl = SHA512_IV[5] | 0;
      this.Dh = SHA512_IV[6] | 0;
      this.Dl = SHA512_IV[7] | 0;
      this.Eh = SHA512_IV[8] | 0;
      this.El = SHA512_IV[9] | 0;
      this.Fh = SHA512_IV[10] | 0;
      this.Fl = SHA512_IV[11] | 0;
      this.Gh = SHA512_IV[12] | 0;
      this.Gl = SHA512_IV[13] | 0;
      this.Hh = SHA512_IV[14] | 0;
      this.Hl = SHA512_IV[15] | 0;
    }
    // prettier-ignore
    get() {
      const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
      return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
      this.Ah = Ah | 0;
      this.Al = Al | 0;
      this.Bh = Bh | 0;
      this.Bl = Bl | 0;
      this.Ch = Ch | 0;
      this.Cl = Cl | 0;
      this.Dh = Dh | 0;
      this.Dl = Dl | 0;
      this.Eh = Eh | 0;
      this.El = El | 0;
      this.Fh = Fh | 0;
      this.Fl = Fl | 0;
      this.Gh = Gh | 0;
      this.Gl = Gl | 0;
      this.Hh = Hh | 0;
      this.Hl = Hl | 0;
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4) {
        SHA512_W_H[i] = view.getUint32(offset);
        SHA512_W_L[i] = view.getUint32(offset += 4);
      }
      for (let i = 16; i < 80; i++) {
        const W15h = SHA512_W_H[i - 15] | 0;
        const W15l = SHA512_W_L[i - 15] | 0;
        const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
        const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
        const W2h = SHA512_W_H[i - 2] | 0;
        const W2l = SHA512_W_L[i - 2] | 0;
        const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
        const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
        const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
        const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
        SHA512_W_H[i] = SUMh | 0;
        SHA512_W_L[i] = SUMl | 0;
      }
      let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
      for (let i = 0; i < 80; i++) {
        const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
        const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
        const CHIh = Eh & Fh ^ ~Eh & Gh;
        const CHIl = El & Fl ^ ~El & Gl;
        const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
        const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
        const T1l = T1ll | 0;
        const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
        const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
        const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
        const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
        Hh = Gh | 0;
        Hl = Gl | 0;
        Gh = Fh | 0;
        Gl = Fl | 0;
        Fh = Eh | 0;
        Fl = El | 0;
        ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
        Dh = Ch | 0;
        Dl = Cl | 0;
        Ch = Bh | 0;
        Cl = Bl | 0;
        Bh = Ah | 0;
        Bl = Al | 0;
        const All = add3L(T1l, sigma0l, MAJl);
        Ah = add3H(All, T1h, sigma0h, MAJh);
        Al = All | 0;
      }
      ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
      ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
      ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
      ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
      ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
      ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
      ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
      ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
      this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
      clean(SHA512_W_H, SHA512_W_L);
    }
    destroy() {
      clean(this.buffer);
      this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
  };
  var sha512 = /* @__PURE__ */ createHasher(() => new SHA512());

  // node_modules/@noble/curves/esm/utils.js
  var _0n = /* @__PURE__ */ BigInt(0);
  var _1n = /* @__PURE__ */ BigInt(1);
  function _abool2(value, title = "") {
    if (typeof value !== "boolean") {
      const prefix = title && `"${title}"`;
      throw new Error(prefix + "expected boolean, got type=" + typeof value);
    }
    return value;
  }
  function _abytes2(value, length, title = "") {
    const bytes = isBytes(value);
    const len = value?.length;
    const needsLen = length !== void 0;
    if (!bytes || needsLen && len !== length) {
      const prefix = title && `"${title}" `;
      const ofLen = needsLen ? ` of length ${length}` : "";
      const got = bytes ? `length=${len}` : `type=${typeof value}`;
      throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
    }
    return value;
  }
  function hexToNumber(hex) {
    if (typeof hex !== "string")
      throw new Error("hex string expected, got " + typeof hex);
    return hex === "" ? _0n : BigInt("0x" + hex);
  }
  function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
  }
  function bytesToNumberLE(bytes) {
    abytes(bytes);
    return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
  }
  function numberToBytesBE(n, len) {
    return hexToBytes(n.toString(16).padStart(len * 2, "0"));
  }
  function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
  }
  function ensureBytes(title, hex, expectedLength) {
    let res;
    if (typeof hex === "string") {
      try {
        res = hexToBytes(hex);
      } catch (e) {
        throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
      }
    } else if (isBytes(hex)) {
      res = Uint8Array.from(hex);
    } else {
      throw new Error(title + " must be hex string or Uint8Array");
    }
    const len = res.length;
    if (typeof expectedLength === "number" && len !== expectedLength)
      throw new Error(title + " of length " + expectedLength + " expected, got " + len);
    return res;
  }
  function equalBytes(a, b) {
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(bytes);
  }
  var isPosBig = (n) => typeof n === "bigint" && _0n <= n;
  function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
  }
  function aInRange(title, n, min, max) {
    if (!inRange(n, min, max))
      throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
  }
  function bitLen(n) {
    let len;
    for (len = 0; n > _0n; n >>= _1n, len += 1)
      ;
    return len;
  }
  var bitMask = (n) => (_1n << BigInt(n)) - _1n;
  function _validateObject(object2, fields, optFields = {}) {
    if (!object2 || typeof object2 !== "object")
      throw new Error("expected valid options object");
    function checkField(fieldName, expectedType, isOpt) {
      const val = object2[fieldName];
      if (isOpt && val === void 0)
        return;
      const current = typeof val;
      if (current !== expectedType || val === null)
        throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
    }
    Object.entries(fields).forEach(([k, v]) => checkField(k, v, false));
    Object.entries(optFields).forEach(([k, v]) => checkField(k, v, true));
  }
  var notImplemented = () => {
    throw new Error("not implemented");
  };
  function memoized(fn) {
    const map = /* @__PURE__ */ new WeakMap();
    return (arg, ...args) => {
      const val = map.get(arg);
      if (val !== void 0)
        return val;
      const computed = fn(arg, ...args);
      map.set(arg, computed);
      return computed;
    };
  }

  // node_modules/@noble/curves/esm/abstract/modular.js
  var _0n2 = BigInt(0);
  var _1n2 = BigInt(1);
  var _2n = /* @__PURE__ */ BigInt(2);
  var _3n = /* @__PURE__ */ BigInt(3);
  var _4n = /* @__PURE__ */ BigInt(4);
  var _5n = /* @__PURE__ */ BigInt(5);
  var _7n = /* @__PURE__ */ BigInt(7);
  var _8n = /* @__PURE__ */ BigInt(8);
  var _9n = /* @__PURE__ */ BigInt(9);
  var _16n = /* @__PURE__ */ BigInt(16);
  function mod(a, b) {
    const result = a % b;
    return result >= _0n2 ? result : b + result;
  }
  function pow2(x, power, modulo) {
    let res = x;
    while (power-- > _0n2) {
      res *= res;
      res %= modulo;
    }
    return res;
  }
  function invert(number2, modulo) {
    if (number2 === _0n2)
      throw new Error("invert: expected non-zero number");
    if (modulo <= _0n2)
      throw new Error("invert: expected positive modulus, got " + modulo);
    let a = mod(number2, modulo);
    let b = modulo;
    let x = _0n2, y = _1n2, u = _1n2, v = _0n2;
    while (a !== _0n2) {
      const q = b / a;
      const r = b % a;
      const m = x - u * q;
      const n = y - v * q;
      b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd = b;
    if (gcd !== _1n2)
      throw new Error("invert: does not exist");
    return mod(x, modulo);
  }
  function assertIsSquare(Fp2, root, n) {
    if (!Fp2.eql(Fp2.sqr(root), n))
      throw new Error("Cannot find square root");
  }
  function sqrt3mod4(Fp2, n) {
    const p1div4 = (Fp2.ORDER + _1n2) / _4n;
    const root = Fp2.pow(n, p1div4);
    assertIsSquare(Fp2, root, n);
    return root;
  }
  function sqrt5mod8(Fp2, n) {
    const p5div8 = (Fp2.ORDER - _5n) / _8n;
    const n2 = Fp2.mul(n, _2n);
    const v = Fp2.pow(n2, p5div8);
    const nv = Fp2.mul(n, v);
    const i = Fp2.mul(Fp2.mul(nv, _2n), v);
    const root = Fp2.mul(nv, Fp2.sub(i, Fp2.ONE));
    assertIsSquare(Fp2, root, n);
    return root;
  }
  function sqrt9mod16(P) {
    const Fp_ = Field(P);
    const tn = tonelliShanks(P);
    const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
    const c2 = tn(Fp_, c1);
    const c3 = tn(Fp_, Fp_.neg(c1));
    const c4 = (P + _7n) / _16n;
    return (Fp2, n) => {
      let tv1 = Fp2.pow(n, c4);
      let tv2 = Fp2.mul(tv1, c1);
      const tv3 = Fp2.mul(tv1, c2);
      const tv4 = Fp2.mul(tv1, c3);
      const e1 = Fp2.eql(Fp2.sqr(tv2), n);
      const e2 = Fp2.eql(Fp2.sqr(tv3), n);
      tv1 = Fp2.cmov(tv1, tv2, e1);
      tv2 = Fp2.cmov(tv4, tv3, e2);
      const e3 = Fp2.eql(Fp2.sqr(tv2), n);
      const root = Fp2.cmov(tv1, tv2, e3);
      assertIsSquare(Fp2, root, n);
      return root;
    };
  }
  function tonelliShanks(P) {
    if (P < _3n)
      throw new Error("sqrt is not defined for small field");
    let Q = P - _1n2;
    let S = 0;
    while (Q % _2n === _0n2) {
      Q /= _2n;
      S++;
    }
    let Z = _2n;
    const _Fp = Field(P);
    while (FpLegendre(_Fp, Z) === 1) {
      if (Z++ > 1e3)
        throw new Error("Cannot find square root: probably non-prime P");
    }
    if (S === 1)
      return sqrt3mod4;
    let cc = _Fp.pow(Z, Q);
    const Q1div2 = (Q + _1n2) / _2n;
    return function tonelliSlow(Fp2, n) {
      if (Fp2.is0(n))
        return n;
      if (FpLegendre(Fp2, n) !== 1)
        throw new Error("Cannot find square root");
      let M = S;
      let c = Fp2.mul(Fp2.ONE, cc);
      let t = Fp2.pow(n, Q);
      let R = Fp2.pow(n, Q1div2);
      while (!Fp2.eql(t, Fp2.ONE)) {
        if (Fp2.is0(t))
          return Fp2.ZERO;
        let i = 1;
        let t_tmp = Fp2.sqr(t);
        while (!Fp2.eql(t_tmp, Fp2.ONE)) {
          i++;
          t_tmp = Fp2.sqr(t_tmp);
          if (i === M)
            throw new Error("Cannot find square root");
        }
        const exponent = _1n2 << BigInt(M - i - 1);
        const b = Fp2.pow(c, exponent);
        M = i;
        c = Fp2.sqr(b);
        t = Fp2.mul(t, c);
        R = Fp2.mul(R, b);
      }
      return R;
    };
  }
  function FpSqrt(P) {
    if (P % _4n === _3n)
      return sqrt3mod4;
    if (P % _8n === _5n)
      return sqrt5mod8;
    if (P % _16n === _9n)
      return sqrt9mod16(P);
    return tonelliShanks(P);
  }
  var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
  var FIELD_FIELDS = [
    "create",
    "isValid",
    "is0",
    "neg",
    "inv",
    "sqrt",
    "sqr",
    "eql",
    "add",
    "sub",
    "mul",
    "pow",
    "div",
    "addN",
    "subN",
    "mulN",
    "sqrN"
  ];
  function validateField(field) {
    const initial = {
      ORDER: "bigint",
      MASK: "bigint",
      BYTES: "number",
      BITS: "number"
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
      map[val] = "function";
      return map;
    }, initial);
    _validateObject(field, opts);
    return field;
  }
  function FpPow(Fp2, num, power) {
    if (power < _0n2)
      throw new Error("invalid exponent, negatives unsupported");
    if (power === _0n2)
      return Fp2.ONE;
    if (power === _1n2)
      return num;
    let p = Fp2.ONE;
    let d = num;
    while (power > _0n2) {
      if (power & _1n2)
        p = Fp2.mul(p, d);
      d = Fp2.sqr(d);
      power >>= _1n2;
    }
    return p;
  }
  function FpInvertBatch(Fp2, nums, passZero = false) {
    const inverted = new Array(nums.length).fill(passZero ? Fp2.ZERO : void 0);
    const multipliedAcc = nums.reduce((acc, num, i) => {
      if (Fp2.is0(num))
        return acc;
      inverted[i] = acc;
      return Fp2.mul(acc, num);
    }, Fp2.ONE);
    const invertedAcc = Fp2.inv(multipliedAcc);
    nums.reduceRight((acc, num, i) => {
      if (Fp2.is0(num))
        return acc;
      inverted[i] = Fp2.mul(acc, inverted[i]);
      return Fp2.mul(acc, num);
    }, invertedAcc);
    return inverted;
  }
  function FpLegendre(Fp2, n) {
    const p1mod2 = (Fp2.ORDER - _1n2) / _2n;
    const powered = Fp2.pow(n, p1mod2);
    const yes = Fp2.eql(powered, Fp2.ONE);
    const zero = Fp2.eql(powered, Fp2.ZERO);
    const no = Fp2.eql(powered, Fp2.neg(Fp2.ONE));
    if (!yes && !zero && !no)
      throw new Error("invalid Legendre symbol result");
    return yes ? 1 : zero ? 0 : -1;
  }
  function nLength(n, nBitLength) {
    if (nBitLength !== void 0)
      anumber(nBitLength);
    const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
  }
  function Field(ORDER, bitLenOrOpts, isLE2 = false, opts = {}) {
    if (ORDER <= _0n2)
      throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
    let _nbitLength = void 0;
    let _sqrt = void 0;
    let modFromBytes = false;
    let allowedLengths = void 0;
    if (typeof bitLenOrOpts === "object" && bitLenOrOpts != null) {
      if (opts.sqrt || isLE2)
        throw new Error("cannot specify opts in two arguments");
      const _opts = bitLenOrOpts;
      if (_opts.BITS)
        _nbitLength = _opts.BITS;
      if (_opts.sqrt)
        _sqrt = _opts.sqrt;
      if (typeof _opts.isLE === "boolean")
        isLE2 = _opts.isLE;
      if (typeof _opts.modFromBytes === "boolean")
        modFromBytes = _opts.modFromBytes;
      allowedLengths = _opts.allowedLengths;
    } else {
      if (typeof bitLenOrOpts === "number")
        _nbitLength = bitLenOrOpts;
      if (opts.sqrt)
        _sqrt = opts.sqrt;
    }
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
    if (BYTES > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    let sqrtP;
    const f = Object.freeze({
      ORDER,
      isLE: isLE2,
      BITS,
      BYTES,
      MASK: bitMask(BITS),
      ZERO: _0n2,
      ONE: _1n2,
      allowedLengths,
      create: (num) => mod(num, ORDER),
      isValid: (num) => {
        if (typeof num !== "bigint")
          throw new Error("invalid field element: expected bigint, got " + typeof num);
        return _0n2 <= num && num < ORDER;
      },
      is0: (num) => num === _0n2,
      // is valid and invertible
      isValidNot0: (num) => !f.is0(num) && f.isValid(num),
      isOdd: (num) => (num & _1n2) === _1n2,
      neg: (num) => mod(-num, ORDER),
      eql: (lhs, rhs) => lhs === rhs,
      sqr: (num) => mod(num * num, ORDER),
      add: (lhs, rhs) => mod(lhs + rhs, ORDER),
      sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
      mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
      pow: (num, power) => FpPow(f, num, power),
      div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
      // Same as above, but doesn't normalize
      sqrN: (num) => num * num,
      addN: (lhs, rhs) => lhs + rhs,
      subN: (lhs, rhs) => lhs - rhs,
      mulN: (lhs, rhs) => lhs * rhs,
      inv: (num) => invert(num, ORDER),
      sqrt: _sqrt || ((n) => {
        if (!sqrtP)
          sqrtP = FpSqrt(ORDER);
        return sqrtP(f, n);
      }),
      toBytes: (num) => isLE2 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
      fromBytes: (bytes, skipValidation = true) => {
        if (allowedLengths) {
          if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
            throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
          }
          const padded = new Uint8Array(BYTES);
          padded.set(bytes, isLE2 ? 0 : padded.length - bytes.length);
          bytes = padded;
        }
        if (bytes.length !== BYTES)
          throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
        let scalar = isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        if (modFromBytes)
          scalar = mod(scalar, ORDER);
        if (!skipValidation) {
          if (!f.isValid(scalar))
            throw new Error("invalid field element: outside of range 0..ORDER");
        }
        return scalar;
      },
      // TODO: we don't need it here, move out to separate fn
      invertBatch: (lst) => FpInvertBatch(f, lst),
      // We can't move this out because Fp6, Fp12 implement it
      // and it's unclear what to return in there.
      cmov: (a, b, c) => c ? b : a
    });
    return Object.freeze(f);
  }

  // node_modules/@noble/curves/esm/abstract/curve.js
  var _0n3 = BigInt(0);
  var _1n3 = BigInt(1);
  function negateCt(condition, item) {
    const neg = item.negate();
    return condition ? neg : item;
  }
  function normalizeZ(c, points) {
    const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
    return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
  }
  function validateW(W, bits) {
    if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
      throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
  }
  function calcWOpts(W, scalarBits) {
    validateW(W, scalarBits);
    const windows = Math.ceil(scalarBits / W) + 1;
    const windowSize = 2 ** (W - 1);
    const maxNumber = 2 ** W;
    const mask = bitMask(W);
    const shiftBy = BigInt(W);
    return { windows, windowSize, mask, maxNumber, shiftBy };
  }
  function calcOffsets(n, window2, wOpts) {
    const { windowSize, mask, maxNumber, shiftBy } = wOpts;
    let wbits = Number(n & mask);
    let nextN = n >> shiftBy;
    if (wbits > windowSize) {
      wbits -= maxNumber;
      nextN += _1n3;
    }
    const offsetStart = window2 * windowSize;
    const offset = offsetStart + Math.abs(wbits) - 1;
    const isZero = wbits === 0;
    const isNeg = wbits < 0;
    const isNegF = window2 % 2 !== 0;
    const offsetF = offsetStart;
    return { nextN, offset, isZero, isNeg, isNegF, offsetF };
  }
  function validateMSMPoints(points, c) {
    if (!Array.isArray(points))
      throw new Error("array expected");
    points.forEach((p, i) => {
      if (!(p instanceof c))
        throw new Error("invalid point at index " + i);
    });
  }
  function validateMSMScalars(scalars, field) {
    if (!Array.isArray(scalars))
      throw new Error("array of scalars expected");
    scalars.forEach((s, i) => {
      if (!field.isValid(s))
        throw new Error("invalid scalar at index " + i);
    });
  }
  var pointPrecomputes = /* @__PURE__ */ new WeakMap();
  var pointWindowSizes = /* @__PURE__ */ new WeakMap();
  function getW(P) {
    return pointWindowSizes.get(P) || 1;
  }
  function assert0(n) {
    if (n !== _0n3)
      throw new Error("invalid wNAF");
  }
  var wNAF = class {
    // Parametrized with a given Point class (not individual point)
    constructor(Point, bits) {
      this.BASE = Point.BASE;
      this.ZERO = Point.ZERO;
      this.Fn = Point.Fn;
      this.bits = bits;
    }
    // non-const time multiplication ladder
    _unsafeLadder(elm, n, p = this.ZERO) {
      let d = elm;
      while (n > _0n3) {
        if (n & _1n3)
          p = p.add(d);
        d = d.double();
        n >>= _1n3;
      }
      return p;
    }
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param point Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(point, W) {
      const { windows, windowSize } = calcWOpts(W, this.bits);
      const points = [];
      let p = point;
      let base2 = p;
      for (let window2 = 0; window2 < windows; window2++) {
        base2 = p;
        points.push(base2);
        for (let i = 1; i < windowSize; i++) {
          base2 = base2.add(p);
          points.push(base2);
        }
        p = base2.double();
      }
      return points;
    }
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * More compact implementation:
     * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
     * @returns real and fake (for const-time) points
     */
    wNAF(W, precomputes, n) {
      if (!this.Fn.isValid(n))
        throw new Error("invalid scalar");
      let p = this.ZERO;
      let f = this.BASE;
      const wo = calcWOpts(W, this.bits);
      for (let window2 = 0; window2 < wo.windows; window2++) {
        const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window2, wo);
        n = nextN;
        if (isZero) {
          f = f.add(negateCt(isNegF, precomputes[offsetF]));
        } else {
          p = p.add(negateCt(isNeg, precomputes[offset]));
        }
      }
      assert0(n);
      return { p, f };
    }
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
      const wo = calcWOpts(W, this.bits);
      for (let window2 = 0; window2 < wo.windows; window2++) {
        if (n === _0n3)
          break;
        const { nextN, offset, isZero, isNeg } = calcOffsets(n, window2, wo);
        n = nextN;
        if (isZero) {
          continue;
        } else {
          const item = precomputes[offset];
          acc = acc.add(isNeg ? item.negate() : item);
        }
      }
      assert0(n);
      return acc;
    }
    getPrecomputes(W, point, transform2) {
      let comp = pointPrecomputes.get(point);
      if (!comp) {
        comp = this.precomputeWindow(point, W);
        if (W !== 1) {
          if (typeof transform2 === "function")
            comp = transform2(comp);
          pointPrecomputes.set(point, comp);
        }
      }
      return comp;
    }
    cached(point, scalar, transform2) {
      const W = getW(point);
      return this.wNAF(W, this.getPrecomputes(W, point, transform2), scalar);
    }
    unsafe(point, scalar, transform2, prev) {
      const W = getW(point);
      if (W === 1)
        return this._unsafeLadder(point, scalar, prev);
      return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform2), scalar, prev);
    }
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    createCache(P, W) {
      validateW(W, this.bits);
      pointWindowSizes.set(P, W);
      pointPrecomputes.delete(P);
    }
    hasCache(elm) {
      return getW(elm) !== 1;
    }
  };
  function pippenger(c, fieldN, points, scalars) {
    validateMSMPoints(points, c);
    validateMSMScalars(scalars, fieldN);
    const plength = points.length;
    const slength = scalars.length;
    if (plength !== slength)
      throw new Error("arrays of points and scalars must have equal length");
    const zero = c.ZERO;
    const wbits = bitLen(BigInt(plength));
    let windowSize = 1;
    if (wbits > 12)
      windowSize = wbits - 3;
    else if (wbits > 4)
      windowSize = wbits - 2;
    else if (wbits > 0)
      windowSize = 2;
    const MASK = bitMask(windowSize);
    const buckets = new Array(Number(MASK) + 1).fill(zero);
    const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
    let sum = zero;
    for (let i = lastBits; i >= 0; i -= windowSize) {
      buckets.fill(zero);
      for (let j = 0; j < slength; j++) {
        const scalar = scalars[j];
        const wbits2 = Number(scalar >> BigInt(i) & MASK);
        buckets[wbits2] = buckets[wbits2].add(points[j]);
      }
      let resI = zero;
      for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
        sumI = sumI.add(buckets[j]);
        resI = resI.add(sumI);
      }
      sum = sum.add(resI);
      if (i !== 0)
        for (let j = 0; j < windowSize; j++)
          sum = sum.double();
    }
    return sum;
  }
  function createField(order, field, isLE2) {
    if (field) {
      if (field.ORDER !== order)
        throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
      validateField(field);
      return field;
    } else {
      return Field(order, { isLE: isLE2 });
    }
  }
  function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
    if (FpFnLE === void 0)
      FpFnLE = type === "edwards";
    if (!CURVE || typeof CURVE !== "object")
      throw new Error(`expected valid ${type} CURVE object`);
    for (const p of ["p", "n", "h"]) {
      const val = CURVE[p];
      if (!(typeof val === "bigint" && val > _0n3))
        throw new Error(`CURVE.${p} must be positive bigint`);
    }
    const Fp2 = createField(CURVE.p, curveOpts.Fp, FpFnLE);
    const Fn2 = createField(CURVE.n, curveOpts.Fn, FpFnLE);
    const _b = type === "weierstrass" ? "b" : "d";
    const params = ["Gx", "Gy", "a", _b];
    for (const p of params) {
      if (!Fp2.isValid(CURVE[p]))
        throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
    }
    CURVE = Object.freeze(Object.assign({}, CURVE));
    return { CURVE, Fp: Fp2, Fn: Fn2 };
  }

  // node_modules/@noble/curves/esm/abstract/edwards.js
  var _0n4 = BigInt(0);
  var _1n4 = BigInt(1);
  var _2n2 = BigInt(2);
  var _8n2 = BigInt(8);
  function isEdValidXY(Fp2, CURVE, x, y) {
    const x2 = Fp2.sqr(x);
    const y2 = Fp2.sqr(y);
    const left = Fp2.add(Fp2.mul(CURVE.a, x2), y2);
    const right = Fp2.add(Fp2.ONE, Fp2.mul(CURVE.d, Fp2.mul(x2, y2)));
    return Fp2.eql(left, right);
  }
  function edwards(params, extraOpts = {}) {
    const validated = _createCurveFields("edwards", params, extraOpts, extraOpts.FpFnLE);
    const { Fp: Fp2, Fn: Fn2 } = validated;
    let CURVE = validated.CURVE;
    const { h: cofactor } = CURVE;
    _validateObject(extraOpts, {}, { uvRatio: "function" });
    const MASK = _2n2 << BigInt(Fn2.BYTES * 8) - _1n4;
    const modP = (n) => Fp2.create(n);
    const uvRatio2 = extraOpts.uvRatio || ((u, v) => {
      try {
        return { isValid: true, value: Fp2.sqrt(Fp2.div(u, v)) };
      } catch (e) {
        return { isValid: false, value: _0n4 };
      }
    });
    if (!isEdValidXY(Fp2, CURVE, CURVE.Gx, CURVE.Gy))
      throw new Error("bad curve params: generator point");
    function acoord(title, n, banZero = false) {
      const min = banZero ? _1n4 : _0n4;
      aInRange("coordinate " + title, n, min, MASK);
      return n;
    }
    function aextpoint(other) {
      if (!(other instanceof Point))
        throw new Error("ExtendedPoint expected");
    }
    const toAffineMemo = memoized((p, iz) => {
      const { X, Y, Z } = p;
      const is0 = p.is0();
      if (iz == null)
        iz = is0 ? _8n2 : Fp2.inv(Z);
      const x = modP(X * iz);
      const y = modP(Y * iz);
      const zz = Fp2.mul(Z, iz);
      if (is0)
        return { x: _0n4, y: _1n4 };
      if (zz !== _1n4)
        throw new Error("invZ was invalid");
      return { x, y };
    });
    const assertValidMemo = memoized((p) => {
      const { a, d } = CURVE;
      if (p.is0())
        throw new Error("bad point: ZERO");
      const { X, Y, Z, T } = p;
      const X2 = modP(X * X);
      const Y2 = modP(Y * Y);
      const Z2 = modP(Z * Z);
      const Z4 = modP(Z2 * Z2);
      const aX2 = modP(X2 * a);
      const left = modP(Z2 * modP(aX2 + Y2));
      const right = modP(Z4 + modP(d * modP(X2 * Y2)));
      if (left !== right)
        throw new Error("bad point: equation left != right (1)");
      const XY = modP(X * Y);
      const ZT = modP(Z * T);
      if (XY !== ZT)
        throw new Error("bad point: equation left != right (2)");
      return true;
    });
    class Point {
      constructor(X, Y, Z, T) {
        this.X = acoord("x", X);
        this.Y = acoord("y", Y);
        this.Z = acoord("z", Z, true);
        this.T = acoord("t", T);
        Object.freeze(this);
      }
      static CURVE() {
        return CURVE;
      }
      static fromAffine(p) {
        if (p instanceof Point)
          throw new Error("extended point not allowed");
        const { x, y } = p || {};
        acoord("x", x);
        acoord("y", y);
        return new Point(x, y, _1n4, modP(x * y));
      }
      // Uses algo from RFC8032 5.1.3.
      static fromBytes(bytes, zip215 = false) {
        const len = Fp2.BYTES;
        const { a, d } = CURVE;
        bytes = copyBytes(_abytes2(bytes, len, "point"));
        _abool2(zip215, "zip215");
        const normed = copyBytes(bytes);
        const lastByte = bytes[len - 1];
        normed[len - 1] = lastByte & ~128;
        const y = bytesToNumberLE(normed);
        const max = zip215 ? MASK : Fp2.ORDER;
        aInRange("point.y", y, _0n4, max);
        const y2 = modP(y * y);
        const u = modP(y2 - _1n4);
        const v = modP(d * y2 - a);
        let { isValid, value: x } = uvRatio2(u, v);
        if (!isValid)
          throw new Error("bad point: invalid y coordinate");
        const isXOdd = (x & _1n4) === _1n4;
        const isLastByteOdd = (lastByte & 128) !== 0;
        if (!zip215 && x === _0n4 && isLastByteOdd)
          throw new Error("bad point: x=0 and x_0=1");
        if (isLastByteOdd !== isXOdd)
          x = modP(-x);
        return Point.fromAffine({ x, y });
      }
      static fromHex(bytes, zip215 = false) {
        return Point.fromBytes(ensureBytes("point", bytes), zip215);
      }
      get x() {
        return this.toAffine().x;
      }
      get y() {
        return this.toAffine().y;
      }
      precompute(windowSize = 8, isLazy = true) {
        wnaf.createCache(this, windowSize);
        if (!isLazy)
          this.multiply(_2n2);
        return this;
      }
      // Useful in fromAffine() - not for fromBytes(), which always created valid points.
      assertValidity() {
        assertValidMemo(this);
      }
      // Compare one point to another.
      equals(other) {
        aextpoint(other);
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const { X: X2, Y: Y2, Z: Z2 } = other;
        const X1Z2 = modP(X1 * Z2);
        const X2Z1 = modP(X2 * Z1);
        const Y1Z2 = modP(Y1 * Z2);
        const Y2Z1 = modP(Y2 * Z1);
        return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
      }
      is0() {
        return this.equals(Point.ZERO);
      }
      negate() {
        return new Point(modP(-this.X), this.Y, this.Z, modP(-this.T));
      }
      // Fast algo for doubling Extended Point.
      // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
      // Cost: 4M + 4S + 1*a + 6add + 1*2.
      double() {
        const { a } = CURVE;
        const { X: X1, Y: Y1, Z: Z1 } = this;
        const A = modP(X1 * X1);
        const B = modP(Y1 * Y1);
        const C = modP(_2n2 * modP(Z1 * Z1));
        const D = modP(a * A);
        const x1y1 = X1 + Y1;
        const E = modP(modP(x1y1 * x1y1) - A - B);
        const G = D + B;
        const F = G - C;
        const H = D - B;
        const X3 = modP(E * F);
        const Y3 = modP(G * H);
        const T3 = modP(E * H);
        const Z3 = modP(F * G);
        return new Point(X3, Y3, Z3, T3);
      }
      // Fast algo for adding 2 Extended Points.
      // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
      // Cost: 9M + 1*a + 1*d + 7add.
      add(other) {
        aextpoint(other);
        const { a, d } = CURVE;
        const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
        const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
        const A = modP(X1 * X2);
        const B = modP(Y1 * Y2);
        const C = modP(T1 * d * T2);
        const D = modP(Z1 * Z2);
        const E = modP((X1 + Y1) * (X2 + Y2) - A - B);
        const F = D - C;
        const G = D + C;
        const H = modP(B - a * A);
        const X3 = modP(E * F);
        const Y3 = modP(G * H);
        const T3 = modP(E * H);
        const Z3 = modP(F * G);
        return new Point(X3, Y3, Z3, T3);
      }
      subtract(other) {
        return this.add(other.negate());
      }
      // Constant-time multiplication.
      multiply(scalar) {
        if (!Fn2.isValidNot0(scalar))
          throw new Error("invalid scalar: expected 1 <= sc < curve.n");
        const { p, f } = wnaf.cached(this, scalar, (p2) => normalizeZ(Point, p2));
        return normalizeZ(Point, [p, f])[0];
      }
      // Non-constant-time multiplication. Uses double-and-add algorithm.
      // It's faster, but should only be used when you don't care about
      // an exposed private key e.g. sig verification.
      // Does NOT allow scalars higher than CURVE.n.
      // Accepts optional accumulator to merge with multiply (important for sparse scalars)
      multiplyUnsafe(scalar, acc = Point.ZERO) {
        if (!Fn2.isValid(scalar))
          throw new Error("invalid scalar: expected 0 <= sc < curve.n");
        if (scalar === _0n4)
          return Point.ZERO;
        if (this.is0() || scalar === _1n4)
          return this;
        return wnaf.unsafe(this, scalar, (p) => normalizeZ(Point, p), acc);
      }
      // Checks if point is of small order.
      // If you add something to small order point, you will have "dirty"
      // point with torsion component.
      // Multiplies point by cofactor and checks if the result is 0.
      isSmallOrder() {
        return this.multiplyUnsafe(cofactor).is0();
      }
      // Multiplies point by curve order and checks if the result is 0.
      // Returns `false` is the point is dirty.
      isTorsionFree() {
        return wnaf.unsafe(this, CURVE.n).is0();
      }
      // Converts Extended point to default (x, y) coordinates.
      // Can accept precomputed Z^-1 - for example, from invertBatch.
      toAffine(invertedZ) {
        return toAffineMemo(this, invertedZ);
      }
      clearCofactor() {
        if (cofactor === _1n4)
          return this;
        return this.multiplyUnsafe(cofactor);
      }
      toBytes() {
        const { x, y } = this.toAffine();
        const bytes = Fp2.toBytes(y);
        bytes[bytes.length - 1] |= x & _1n4 ? 128 : 0;
        return bytes;
      }
      toHex() {
        return bytesToHex(this.toBytes());
      }
      toString() {
        return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
      }
      // TODO: remove
      get ex() {
        return this.X;
      }
      get ey() {
        return this.Y;
      }
      get ez() {
        return this.Z;
      }
      get et() {
        return this.T;
      }
      static normalizeZ(points) {
        return normalizeZ(Point, points);
      }
      static msm(points, scalars) {
        return pippenger(Point, Fn2, points, scalars);
      }
      _setWindowSize(windowSize) {
        this.precompute(windowSize);
      }
      toRawBytes() {
        return this.toBytes();
      }
    }
    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n4, modP(CURVE.Gx * CURVE.Gy));
    Point.ZERO = new Point(_0n4, _1n4, _1n4, _0n4);
    Point.Fp = Fp2;
    Point.Fn = Fn2;
    const wnaf = new wNAF(Point, Fn2.BITS);
    Point.BASE.precompute(8);
    return Point;
  }
  var PrimeEdwardsPoint = class {
    constructor(ep) {
      this.ep = ep;
    }
    // Static methods that must be implemented by subclasses
    static fromBytes(_bytes2) {
      notImplemented();
    }
    static fromHex(_hex) {
      notImplemented();
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    // Common implementations
    clearCofactor() {
      return this;
    }
    assertValidity() {
      this.ep.assertValidity();
    }
    toAffine(invertedZ) {
      return this.ep.toAffine(invertedZ);
    }
    toHex() {
      return bytesToHex(this.toBytes());
    }
    toString() {
      return this.toHex();
    }
    isTorsionFree() {
      return true;
    }
    isSmallOrder() {
      return false;
    }
    add(other) {
      this.assertSame(other);
      return this.init(this.ep.add(other.ep));
    }
    subtract(other) {
      this.assertSame(other);
      return this.init(this.ep.subtract(other.ep));
    }
    multiply(scalar) {
      return this.init(this.ep.multiply(scalar));
    }
    multiplyUnsafe(scalar) {
      return this.init(this.ep.multiplyUnsafe(scalar));
    }
    double() {
      return this.init(this.ep.double());
    }
    negate() {
      return this.init(this.ep.negate());
    }
    precompute(windowSize, isLazy) {
      return this.init(this.ep.precompute(windowSize, isLazy));
    }
    /** @deprecated use `toBytes` */
    toRawBytes() {
      return this.toBytes();
    }
  };
  function eddsa(Point, cHash, eddsaOpts = {}) {
    if (typeof cHash !== "function")
      throw new Error('"hash" function param is required');
    _validateObject(eddsaOpts, {}, {
      adjustScalarBytes: "function",
      randomBytes: "function",
      domain: "function",
      prehash: "function",
      mapToCurve: "function"
    });
    const { prehash } = eddsaOpts;
    const { BASE, Fp: Fp2, Fn: Fn2 } = Point;
    const randomBytes2 = eddsaOpts.randomBytes || randomBytes;
    const adjustScalarBytes2 = eddsaOpts.adjustScalarBytes || ((bytes) => bytes);
    const domain = eddsaOpts.domain || ((data, ctx, phflag) => {
      _abool2(phflag, "phflag");
      if (ctx.length || phflag)
        throw new Error("Contexts/pre-hash are not supported");
      return data;
    });
    function modN_LE(hash) {
      return Fn2.create(bytesToNumberLE(hash));
    }
    function getPrivateScalar(key) {
      const len = lengths.secretKey;
      key = ensureBytes("private key", key, len);
      const hashed = ensureBytes("hashed private key", cHash(key), 2 * len);
      const head = adjustScalarBytes2(hashed.slice(0, len));
      const prefix = hashed.slice(len, 2 * len);
      const scalar = modN_LE(head);
      return { head, prefix, scalar };
    }
    function getExtendedPublicKey(secretKey) {
      const { head, prefix, scalar } = getPrivateScalar(secretKey);
      const point = BASE.multiply(scalar);
      const pointBytes = point.toBytes();
      return { head, prefix, scalar, point, pointBytes };
    }
    function getPublicKey(secretKey) {
      return getExtendedPublicKey(secretKey).pointBytes;
    }
    function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
      const msg = concatBytes(...msgs);
      return modN_LE(cHash(domain(msg, ensureBytes("context", context), !!prehash)));
    }
    function sign(msg, secretKey, options = {}) {
      msg = ensureBytes("message", msg);
      if (prehash)
        msg = prehash(msg);
      const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
      const r = hashDomainToScalar(options.context, prefix, msg);
      const R = BASE.multiply(r).toBytes();
      const k = hashDomainToScalar(options.context, R, pointBytes, msg);
      const s = Fn2.create(r + k * scalar);
      if (!Fn2.isValid(s))
        throw new Error("sign failed: invalid s");
      const rs = concatBytes(R, Fn2.toBytes(s));
      return _abytes2(rs, lengths.signature, "result");
    }
    const verifyOpts = { zip215: true };
    function verify(sig, msg, publicKey, options = verifyOpts) {
      const { context, zip215 } = options;
      const len = lengths.signature;
      sig = ensureBytes("signature", sig, len);
      msg = ensureBytes("message", msg);
      publicKey = ensureBytes("publicKey", publicKey, lengths.publicKey);
      if (zip215 !== void 0)
        _abool2(zip215, "zip215");
      if (prehash)
        msg = prehash(msg);
      const mid = len / 2;
      const r = sig.subarray(0, mid);
      const s = bytesToNumberLE(sig.subarray(mid, len));
      let A, R, SB;
      try {
        A = Point.fromBytes(publicKey, zip215);
        R = Point.fromBytes(r, zip215);
        SB = BASE.multiplyUnsafe(s);
      } catch (error) {
        return false;
      }
      if (!zip215 && A.isSmallOrder())
        return false;
      const k = hashDomainToScalar(context, R.toBytes(), A.toBytes(), msg);
      const RkA = R.add(A.multiplyUnsafe(k));
      return RkA.subtract(SB).clearCofactor().is0();
    }
    const _size = Fp2.BYTES;
    const lengths = {
      secretKey: _size,
      publicKey: _size,
      signature: 2 * _size,
      seed: _size
    };
    function randomSecretKey(seed = randomBytes2(lengths.seed)) {
      return _abytes2(seed, lengths.seed, "seed");
    }
    function keygen(seed) {
      const secretKey = utils.randomSecretKey(seed);
      return { secretKey, publicKey: getPublicKey(secretKey) };
    }
    function isValidSecretKey(key) {
      return isBytes(key) && key.length === Fn2.BYTES;
    }
    function isValidPublicKey(key, zip215) {
      try {
        return !!Point.fromBytes(key, zip215);
      } catch (error) {
        return false;
      }
    }
    const utils = {
      getExtendedPublicKey,
      randomSecretKey,
      isValidSecretKey,
      isValidPublicKey,
      /**
       * Converts ed public key to x public key. Uses formula:
       * - ed25519:
       *   - `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
       *   - `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
       * - ed448:
       *   - `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
       *   - `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
       */
      toMontgomery(publicKey) {
        const { y } = Point.fromBytes(publicKey);
        const size = lengths.publicKey;
        const is25519 = size === 32;
        if (!is25519 && size !== 57)
          throw new Error("only defined for 25519 and 448");
        const u = is25519 ? Fp2.div(_1n4 + y, _1n4 - y) : Fp2.div(y - _1n4, y + _1n4);
        return Fp2.toBytes(u);
      },
      toMontgomerySecret(secretKey) {
        const size = lengths.secretKey;
        _abytes2(secretKey, size);
        const hashed = cHash(secretKey.subarray(0, size));
        return adjustScalarBytes2(hashed).subarray(0, size);
      },
      /** @deprecated */
      randomPrivateKey: randomSecretKey,
      /** @deprecated */
      precompute(windowSize = 8, point = Point.BASE) {
        return point.precompute(windowSize, false);
      }
    };
    return Object.freeze({
      keygen,
      getPublicKey,
      sign,
      verify,
      utils,
      Point,
      lengths
    });
  }
  function _eddsa_legacy_opts_to_new(c) {
    const CURVE = {
      a: c.a,
      d: c.d,
      p: c.Fp.ORDER,
      n: c.n,
      h: c.h,
      Gx: c.Gx,
      Gy: c.Gy
    };
    const Fp2 = c.Fp;
    const Fn2 = Field(CURVE.n, c.nBitLength, true);
    const curveOpts = { Fp: Fp2, Fn: Fn2, uvRatio: c.uvRatio };
    const eddsaOpts = {
      randomBytes: c.randomBytes,
      adjustScalarBytes: c.adjustScalarBytes,
      domain: c.domain,
      prehash: c.prehash,
      mapToCurve: c.mapToCurve
    };
    return { CURVE, curveOpts, hash: c.hash, eddsaOpts };
  }
  function _eddsa_new_output_to_legacy(c, eddsa2) {
    const Point = eddsa2.Point;
    const legacy = Object.assign({}, eddsa2, {
      ExtendedPoint: Point,
      CURVE: c,
      nBitLength: Point.Fn.BITS,
      nByteLength: Point.Fn.BYTES
    });
    return legacy;
  }
  function twistedEdwards(c) {
    const { CURVE, curveOpts, hash, eddsaOpts } = _eddsa_legacy_opts_to_new(c);
    const Point = edwards(CURVE, curveOpts);
    const EDDSA = eddsa(Point, hash, eddsaOpts);
    return _eddsa_new_output_to_legacy(c, EDDSA);
  }

  // node_modules/@noble/curves/esm/ed25519.js
  var _0n5 = /* @__PURE__ */ BigInt(0);
  var _1n5 = BigInt(1);
  var _2n3 = BigInt(2);
  var _3n2 = BigInt(3);
  var _5n2 = BigInt(5);
  var _8n3 = BigInt(8);
  var ed25519_CURVE_p = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
  var ed25519_CURVE = /* @__PURE__ */ (() => ({
    p: ed25519_CURVE_p,
    n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
    h: _8n3,
    a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
    d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
    Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
    Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
  }))();
  function ed25519_pow_2_252_3(x) {
    const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
    const P = ed25519_CURVE_p;
    const x2 = x * x % P;
    const b2 = x2 * x % P;
    const b4 = pow2(b2, _2n3, P) * b2 % P;
    const b5 = pow2(b4, _1n5, P) * x % P;
    const b10 = pow2(b5, _5n2, P) * b5 % P;
    const b20 = pow2(b10, _10n, P) * b10 % P;
    const b40 = pow2(b20, _20n, P) * b20 % P;
    const b80 = pow2(b40, _40n, P) * b40 % P;
    const b160 = pow2(b80, _80n, P) * b80 % P;
    const b240 = pow2(b160, _80n, P) * b80 % P;
    const b250 = pow2(b240, _10n, P) * b10 % P;
    const pow_p_5_8 = pow2(b250, _2n3, P) * x % P;
    return { pow_p_5_8, b2 };
  }
  function adjustScalarBytes(bytes) {
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
    return bytes;
  }
  var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
  function uvRatio(u, v) {
    const P = ed25519_CURVE_p;
    const v3 = mod(v * v * v, P);
    const v7 = mod(v3 * v3 * v, P);
    const pow = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
    let x = mod(u * v3 * pow, P);
    const vx2 = mod(v * x * x, P);
    const root1 = x;
    const root2 = mod(x * ED25519_SQRT_M1, P);
    const useRoot1 = vx2 === u;
    const useRoot2 = vx2 === mod(-u, P);
    const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
    if (useRoot1)
      x = root1;
    if (useRoot2 || noRoot)
      x = root2;
    if (isNegativeLE(x, P))
      x = mod(-x, P);
    return { isValid: useRoot1 || useRoot2, value: x };
  }
  var Fp = /* @__PURE__ */ (() => Field(ed25519_CURVE.p, { isLE: true }))();
  var Fn = /* @__PURE__ */ (() => Field(ed25519_CURVE.n, { isLE: true }))();
  var ed25519Defaults = /* @__PURE__ */ (() => ({
    ...ed25519_CURVE,
    Fp,
    hash: sha512,
    adjustScalarBytes,
    // dom2
    // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
    // Constant-time, u/√v
    uvRatio
  }))();
  var ed25519 = /* @__PURE__ */ (() => twistedEdwards(ed25519Defaults))();
  var SQRT_M1 = ED25519_SQRT_M1;
  var SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt("25063068953384623474111414158702152701244531502492656460079210482610430750235");
  var INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt("54469307008909316920995813868745141605393597292927456921205312896311721017578");
  var ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt("1159843021668779879193775521855586647937357759715417654439879720876111806838");
  var D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt("40440834346308536858101042469323190826248399146238708352240133220865137265952");
  var invertSqrt = (number2) => uvRatio(_1n5, number2);
  var MAX_255B = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  var bytes255ToNumberLE = (bytes) => ed25519.Point.Fp.create(bytesToNumberLE(bytes) & MAX_255B);
  function calcElligatorRistrettoMap(r0) {
    const { d } = ed25519_CURVE;
    const P = ed25519_CURVE_p;
    const mod2 = (n) => Fp.create(n);
    const r = mod2(SQRT_M1 * r0 * r0);
    const Ns = mod2((r + _1n5) * ONE_MINUS_D_SQ);
    let c = BigInt(-1);
    const D = mod2((c - d * r) * mod2(r + d));
    let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D);
    let s_ = mod2(s * r0);
    if (!isNegativeLE(s_, P))
      s_ = mod2(-s_);
    if (!Ns_D_is_sq)
      s = s_;
    if (!Ns_D_is_sq)
      c = r;
    const Nt = mod2(c * (r - _1n5) * D_MINUS_ONE_SQ - D);
    const s2 = s * s;
    const W0 = mod2((s + s) * D);
    const W1 = mod2(Nt * SQRT_AD_MINUS_ONE);
    const W2 = mod2(_1n5 - s2);
    const W3 = mod2(_1n5 + s2);
    return new ed25519.Point(mod2(W0 * W3), mod2(W2 * W1), mod2(W1 * W3), mod2(W0 * W2));
  }
  function ristretto255_map(bytes) {
    abytes(bytes, 64);
    const r1 = bytes255ToNumberLE(bytes.subarray(0, 32));
    const R1 = calcElligatorRistrettoMap(r1);
    const r2 = bytes255ToNumberLE(bytes.subarray(32, 64));
    const R2 = calcElligatorRistrettoMap(r2);
    return new _RistrettoPoint(R1.add(R2));
  }
  var _RistrettoPoint = class __RistrettoPoint extends PrimeEdwardsPoint {
    constructor(ep) {
      super(ep);
    }
    static fromAffine(ap) {
      return new __RistrettoPoint(ed25519.Point.fromAffine(ap));
    }
    assertSame(other) {
      if (!(other instanceof __RistrettoPoint))
        throw new Error("RistrettoPoint expected");
    }
    init(ep) {
      return new __RistrettoPoint(ep);
    }
    /** @deprecated use `import { ristretto255_hasher } from '@noble/curves/ed25519.js';` */
    static hashToCurve(hex) {
      return ristretto255_map(ensureBytes("ristrettoHash", hex, 64));
    }
    static fromBytes(bytes) {
      abytes(bytes, 32);
      const { a, d } = ed25519_CURVE;
      const P = ed25519_CURVE_p;
      const mod2 = (n) => Fp.create(n);
      const s = bytes255ToNumberLE(bytes);
      if (!equalBytes(Fp.toBytes(s), bytes) || isNegativeLE(s, P))
        throw new Error("invalid ristretto255 encoding 1");
      const s2 = mod2(s * s);
      const u1 = mod2(_1n5 + a * s2);
      const u2 = mod2(_1n5 - a * s2);
      const u1_2 = mod2(u1 * u1);
      const u2_2 = mod2(u2 * u2);
      const v = mod2(a * d * u1_2 - u2_2);
      const { isValid, value: I } = invertSqrt(mod2(v * u2_2));
      const Dx = mod2(I * u2);
      const Dy = mod2(I * Dx * v);
      let x = mod2((s + s) * Dx);
      if (isNegativeLE(x, P))
        x = mod2(-x);
      const y = mod2(u1 * Dy);
      const t = mod2(x * y);
      if (!isValid || isNegativeLE(t, P) || y === _0n5)
        throw new Error("invalid ristretto255 encoding 2");
      return new __RistrettoPoint(new ed25519.Point(x, y, _1n5, t));
    }
    /**
     * Converts ristretto-encoded string to ristretto point.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
     * @param hex Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
     */
    static fromHex(hex) {
      return __RistrettoPoint.fromBytes(ensureBytes("ristrettoHex", hex, 32));
    }
    static msm(points, scalars) {
      return pippenger(__RistrettoPoint, ed25519.Point.Fn, points, scalars);
    }
    /**
     * Encodes ristretto point to Uint8Array.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
     */
    toBytes() {
      let { X, Y, Z, T } = this.ep;
      const P = ed25519_CURVE_p;
      const mod2 = (n) => Fp.create(n);
      const u1 = mod2(mod2(Z + Y) * mod2(Z - Y));
      const u2 = mod2(X * Y);
      const u2sq = mod2(u2 * u2);
      const { value: invsqrt } = invertSqrt(mod2(u1 * u2sq));
      const D1 = mod2(invsqrt * u1);
      const D2 = mod2(invsqrt * u2);
      const zInv = mod2(D1 * D2 * T);
      let D;
      if (isNegativeLE(T * zInv, P)) {
        let _x = mod2(Y * SQRT_M1);
        let _y = mod2(X * SQRT_M1);
        X = _x;
        Y = _y;
        D = mod2(D1 * INVSQRT_A_MINUS_D);
      } else {
        D = D2;
      }
      if (isNegativeLE(X * zInv, P))
        Y = mod2(-Y);
      let s = mod2((Z - Y) * D);
      if (isNegativeLE(s, P))
        s = mod2(-s);
      return Fp.toBytes(s);
    }
    /**
     * Compares two Ristretto points.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
     */
    equals(other) {
      this.assertSame(other);
      const { X: X1, Y: Y1 } = this.ep;
      const { X: X2, Y: Y2 } = other.ep;
      const mod2 = (n) => Fp.create(n);
      const one = mod2(X1 * Y2) === mod2(Y1 * X2);
      const two = mod2(Y1 * Y2) === mod2(X1 * X2);
      return one || two;
    }
    is0() {
      return this.equals(__RistrettoPoint.ZERO);
    }
  };
  _RistrettoPoint.BASE = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519.Point.BASE))();
  _RistrettoPoint.ZERO = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519.Point.ZERO))();
  _RistrettoPoint.Fp = /* @__PURE__ */ (() => Fp)();
  _RistrettoPoint.Fn = /* @__PURE__ */ (() => Fn)();

  // node_modules/@mysten/sui/dist/esm/cryptography/keypair.js
  var import_bech32 = __toESM(require_dist(), 1);

  // node_modules/@mysten/sui/dist/esm/cryptography/intent.js
  function messageWithIntent(scope, message) {
    return suiBcs.IntentMessage(suiBcs.fixedArray(message.length, suiBcs.u8())).serialize({
      intent: {
        scope: { [scope]: true },
        version: { V0: true },
        appId: { Sui: true }
      },
      value: message
    }).toBytes();
  }

  // node_modules/@mysten/sui/dist/esm/cryptography/signature-scheme.js
  var SIGNATURE_SCHEME_TO_FLAG = {
    ED25519: 0,
    Secp256k1: 1,
    Secp256r1: 2,
    MultiSig: 3,
    ZkLogin: 5,
    Passkey: 6
  };
  var SIGNATURE_SCHEME_TO_SIZE = {
    ED25519: 32,
    Secp256k1: 33,
    Secp256r1: 33
  };
  var SIGNATURE_FLAG_TO_SCHEME = {
    0: "ED25519",
    1: "Secp256k1",
    2: "Secp256r1",
    3: "MultiSig",
    5: "ZkLogin",
    6: "Passkey"
  };

  // node_modules/@noble/hashes/esm/hmac.js
  var HMAC = class extends Hash {
    constructor(hash, _key) {
      super();
      this.finished = false;
      this.destroyed = false;
      ahash(hash);
      const key = toBytes(_key);
      this.iHash = hash.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("Expected instance of class which extends utils.Hash");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash.create();
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54 ^ 92;
      this.oHash.update(pad);
      clean(pad);
    }
    update(buf) {
      aexists(this);
      this.iHash.update(buf);
      return this;
    }
    digestInto(out) {
      aexists(this);
      abytes(out, this.outputLen);
      this.finished = true;
      this.iHash.digestInto(out);
      this.oHash.update(out);
      this.oHash.digestInto(out);
      this.destroy();
    }
    digest() {
      const out = new Uint8Array(this.oHash.outputLen);
      this.digestInto(out);
      return out;
    }
    _cloneInto(to) {
      to || (to = Object.create(Object.getPrototypeOf(this), {}));
      const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
      to = to;
      to.finished = finished;
      to.destroyed = destroyed;
      to.blockLen = blockLen;
      to.outputLen = outputLen;
      to.oHash = oHash._cloneInto(to.oHash);
      to.iHash = iHash._cloneInto(to.iHash);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
    destroy() {
      this.destroyed = true;
      this.oHash.destroy();
      this.iHash.destroy();
    }
  };
  var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
  hmac.create = (hash, key) => new HMAC(hash, key);

  // node_modules/@mysten/sui/dist/esm/cryptography/publickey.js
  function bytesEqual(a, b) {
    if (a === b) return true;
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  var PublicKey2 = class {
    /**
     * Checks if two public keys are equal
     */
    equals(publicKey) {
      return bytesEqual(this.toRawBytes(), publicKey.toRawBytes());
    }
    /**
     * Return the base-64 representation of the public key
     */
    toBase64() {
      return toBase64(this.toRawBytes());
    }
    toString() {
      throw new Error(
        "`toString` is not implemented on public keys. Use `toBase64()` or `toRawBytes()` instead."
      );
    }
    /**
     * Return the Sui representation of the public key encoded in
     * base-64. A Sui public key is formed by the concatenation
     * of the scheme flag with the raw bytes of the public key
     */
    toSuiPublicKey() {
      const bytes = this.toSuiBytes();
      return toBase64(bytes);
    }
    verifyWithIntent(bytes, signature, intent) {
      const intentMessage = messageWithIntent(intent, bytes);
      const digest = blake2b2(intentMessage, { dkLen: 32 });
      return this.verify(digest, signature);
    }
    /**
     * Verifies that the signature is valid for for the provided PersonalMessage
     */
    verifyPersonalMessage(message, signature) {
      return this.verifyWithIntent(
        suiBcs.vector(suiBcs.u8()).serialize(message).toBytes(),
        signature,
        "PersonalMessage"
      );
    }
    /**
     * Verifies that the signature is valid for for the provided Transaction
     */
    verifyTransaction(transaction, signature) {
      return this.verifyWithIntent(transaction, signature, "TransactionData");
    }
    /**
     * Verifies that the public key is associated with the provided address
     */
    verifyAddress(address) {
      return this.toSuiAddress() === address;
    }
    /**
     * Returns the bytes representation of the public key
     * prefixed with the signature scheme flag
     */
    toSuiBytes() {
      const rawBytes = this.toRawBytes();
      const suiBytes = new Uint8Array(rawBytes.length + 1);
      suiBytes.set([this.flag()]);
      suiBytes.set(rawBytes, 1);
      return suiBytes;
    }
    /**
     * Return the Sui address associated with this Ed25519 public key
     */
    toSuiAddress() {
      return normalizeSuiAddress(
        bytesToHex(blake2b2(this.toSuiBytes(), { dkLen: 32 })).slice(0, SUI_ADDRESS_LENGTH * 2)
      );
    }
  };
  function parseSerializedKeypairSignature(serializedSignature) {
    const bytes = fromBase64(serializedSignature);
    const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0]];
    switch (signatureScheme) {
      case "ED25519":
      case "Secp256k1":
      case "Secp256r1":
        const size = SIGNATURE_SCHEME_TO_SIZE[signatureScheme];
        const signature = bytes.slice(1, bytes.length - size);
        const publicKey = bytes.slice(1 + signature.length);
        return {
          serializedSignature,
          signatureScheme,
          signature,
          publicKey,
          bytes
        };
      default:
        throw new Error("Unsupported signature scheme");
    }
  }

  // node_modules/@mysten/sui/dist/esm/cryptography/signature.js
  function toSerializedSignature({
    signature,
    signatureScheme,
    publicKey
  }) {
    if (!publicKey) {
      throw new Error("`publicKey` is required");
    }
    const pubKeyBytes = publicKey.toRawBytes();
    const serializedSignature = new Uint8Array(1 + signature.length + pubKeyBytes.length);
    serializedSignature.set([SIGNATURE_SCHEME_TO_FLAG[signatureScheme]]);
    serializedSignature.set(signature, 1);
    serializedSignature.set(pubKeyBytes, 1 + signature.length);
    return toBase64(serializedSignature);
  }

  // node_modules/@mysten/sui/dist/esm/cryptography/keypair.js
  var PRIVATE_KEY_SIZE = 32;
  var SUI_PRIVATE_KEY_PREFIX = "suiprivkey";
  var Signer = class {
    /**
     * Sign messages with a specific intent. By combining the message bytes with the intent before hashing and signing,
     * it ensures that a signed message is tied to a specific purpose and domain separator is provided
     */
    async signWithIntent(bytes, intent) {
      const intentMessage = messageWithIntent(intent, bytes);
      const digest = blake2b2(intentMessage, { dkLen: 32 });
      const signature = toSerializedSignature({
        signature: await this.sign(digest),
        signatureScheme: this.getKeyScheme(),
        publicKey: this.getPublicKey()
      });
      return {
        signature,
        bytes: toBase64(bytes)
      };
    }
    /**
     * Signs provided transaction by calling `signWithIntent()` with a `TransactionData` provided as intent scope
     */
    async signTransaction(bytes) {
      return this.signWithIntent(bytes, "TransactionData");
    }
    /**
     * Signs provided personal message by calling `signWithIntent()` with a `PersonalMessage` provided as intent scope
     */
    async signPersonalMessage(bytes) {
      const { signature } = await this.signWithIntent(
        bcs.vector(bcs.u8()).serialize(bytes).toBytes(),
        "PersonalMessage"
      );
      return {
        bytes: toBase64(bytes),
        signature
      };
    }
    toSuiAddress() {
      return this.getPublicKey().toSuiAddress();
    }
  };
  var Keypair = class extends Signer {
  };
  function decodeSuiPrivateKey(value) {
    const { prefix, words } = import_bech32.bech32.decode(value);
    if (prefix !== SUI_PRIVATE_KEY_PREFIX) {
      throw new Error("invalid private key prefix");
    }
    const extendedSecretKey = new Uint8Array(import_bech32.bech32.fromWords(words));
    const secretKey = extendedSecretKey.slice(1);
    const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[extendedSecretKey[0]];
    return {
      schema: signatureScheme,
      secretKey
    };
  }
  function encodeSuiPrivateKey(bytes, scheme) {
    if (bytes.length !== PRIVATE_KEY_SIZE) {
      throw new Error("Invalid bytes length");
    }
    const flag = SIGNATURE_SCHEME_TO_FLAG[scheme];
    const privKeyBytes = new Uint8Array(bytes.length + 1);
    privKeyBytes.set([flag]);
    privKeyBytes.set(bytes, 1);
    return import_bech32.bech32.encode(SUI_PRIVATE_KEY_PREFIX, import_bech32.bech32.toWords(privKeyBytes));
  }

  // node_modules/@noble/hashes/esm/pbkdf2.js
  function pbkdf2Init(hash, _password, _salt, _opts) {
    ahash(hash);
    const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
    const { c, dkLen, asyncTick } = opts;
    anumber(c);
    anumber(dkLen);
    anumber(asyncTick);
    if (c < 1)
      throw new Error("iterations (c) should be >= 1");
    const password = kdfInputToBytes(_password);
    const salt = kdfInputToBytes(_salt);
    const DK = new Uint8Array(dkLen);
    const PRF = hmac.create(hash, password);
    const PRFSalt = PRF._cloneInto().update(salt);
    return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
  }
  function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
    PRF.destroy();
    PRFSalt.destroy();
    if (prfW)
      prfW.destroy();
    clean(u);
    return DK;
  }
  function pbkdf2(hash, password, salt, opts) {
    const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW;
    const arr = new Uint8Array(4);
    const view = createView(arr);
    const u = new Uint8Array(PRF.outputLen);
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
      const Ti = DK.subarray(pos, pos + PRF.outputLen);
      view.setInt32(0, ti, false);
      (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
      Ti.set(u.subarray(0, Ti.length));
      for (let ui = 1; ui < c; ui++) {
        PRF._cloneInto(prfW).update(u).digestInto(u);
        for (let i = 0; i < Ti.length; i++)
          Ti[i] ^= u[i];
      }
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
  }

  // node_modules/@scure/bip39/esm/index.js
  function nfkd(str) {
    if (typeof str !== "string")
      throw new TypeError("invalid mnemonic type: " + typeof str);
    return str.normalize("NFKD");
  }
  function normalize(str) {
    const norm = nfkd(str);
    const words = norm.split(" ");
    if (![12, 15, 18, 21, 24].includes(words.length))
      throw new Error("Invalid mnemonic");
    return { nfkd: norm, words };
  }
  var psalt = (passphrase) => nfkd("mnemonic" + passphrase);
  function mnemonicToSeedSync(mnemonic, passphrase = "") {
    return pbkdf2(sha512, normalize(mnemonic).nfkd, psalt(passphrase), { c: 2048, dkLen: 64 });
  }

  // node_modules/@mysten/sui/dist/esm/cryptography/mnemonics.js
  function isValidHardenedPath(path) {
    if (!new RegExp("^m\\/44'\\/784'\\/[0-9]+'\\/[0-9]+'\\/[0-9]+'+$").test(path)) {
      return false;
    }
    return true;
  }
  function mnemonicToSeed(mnemonics) {
    return mnemonicToSeedSync(mnemonics, "");
  }
  function mnemonicToSeedHex(mnemonics) {
    return toHex(mnemonicToSeed(mnemonics));
  }

  // node_modules/@noble/hashes/esm/sha512.js
  var sha5122 = sha512;

  // node_modules/@mysten/sui/dist/esm/keypairs/ed25519/ed25519-hd-key.js
  var ED25519_CURVE = "ed25519 seed";
  var HARDENED_OFFSET = 2147483648;
  var pathRegex = new RegExp("^m(\\/[0-9]+')+$");
  var replaceDerive = (val) => val.replace("'", "");
  var getMasterKeyFromSeed = (seed) => {
    const h = hmac.create(sha5122, ED25519_CURVE);
    const I = h.update(fromHex(seed)).digest();
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
      key: IL,
      chainCode: IR
    };
  };
  var CKDPriv = ({ key, chainCode }, index) => {
    const indexBuffer = new ArrayBuffer(4);
    const cv = new DataView(indexBuffer);
    cv.setUint32(0, index);
    const data = new Uint8Array(1 + key.length + indexBuffer.byteLength);
    data.set(new Uint8Array(1).fill(0));
    data.set(key, 1);
    data.set(new Uint8Array(indexBuffer, 0, indexBuffer.byteLength), key.length + 1);
    const I = hmac.create(sha5122, chainCode).update(data).digest();
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return {
      key: IL,
      chainCode: IR
    };
  };
  var isValidPath = (path) => {
    if (!pathRegex.test(path)) {
      return false;
    }
    return !path.split("/").slice(1).map(replaceDerive).some(
      isNaN
      /* ts T_T*/
    );
  };
  var derivePath = (path, seed, offset = HARDENED_OFFSET) => {
    if (!isValidPath(path)) {
      throw new Error("Invalid derivation path");
    }
    const { key, chainCode } = getMasterKeyFromSeed(seed);
    const segments = path.split("/").slice(1).map(replaceDerive).map((el) => parseInt(el, 10));
    return segments.reduce((parentKeys, segment) => CKDPriv(parentKeys, segment + offset), {
      key,
      chainCode
    });
  };

  // node_modules/@mysten/sui/dist/esm/keypairs/ed25519/publickey.js
  var PUBLIC_KEY_SIZE = 32;
  var Ed25519PublicKey = class extends PublicKey2 {
    /**
     * Create a new Ed25519PublicKey object
     * @param value ed25519 public key as buffer or base-64 encoded string
     */
    constructor(value) {
      super();
      if (typeof value === "string") {
        this.data = fromBase64(value);
      } else if (value instanceof Uint8Array) {
        this.data = value;
      } else {
        this.data = Uint8Array.from(value);
      }
      if (this.data.length !== PUBLIC_KEY_SIZE) {
        throw new Error(
          `Invalid public key input. Expected ${PUBLIC_KEY_SIZE} bytes, got ${this.data.length}`
        );
      }
    }
    /**
     * Checks if two Ed25519 public keys are equal
     */
    equals(publicKey) {
      return super.equals(publicKey);
    }
    /**
     * Return the byte array representation of the Ed25519 public key
     */
    toRawBytes() {
      return this.data;
    }
    /**
     * Return the Sui address associated with this Ed25519 public key
     */
    flag() {
      return SIGNATURE_SCHEME_TO_FLAG["ED25519"];
    }
    /**
     * Verifies that the signature is valid for for the provided message
     */
    async verify(message, signature) {
      let bytes;
      if (typeof signature === "string") {
        const parsed = parseSerializedKeypairSignature(signature);
        if (parsed.signatureScheme !== "ED25519") {
          throw new Error("Invalid signature scheme");
        }
        if (!bytesEqual(this.toRawBytes(), parsed.publicKey)) {
          throw new Error("Signature does not match public key");
        }
        bytes = parsed.signature;
      } else {
        bytes = signature;
      }
      return ed25519.verify(bytes, message, this.toRawBytes());
    }
  };
  Ed25519PublicKey.SIZE = PUBLIC_KEY_SIZE;

  // node_modules/@mysten/sui/dist/esm/keypairs/ed25519/keypair.js
  var DEFAULT_ED25519_DERIVATION_PATH = "m/44'/784'/0'/0'/0'";
  var Ed25519Keypair = class _Ed25519Keypair extends Keypair {
    /**
     * Create a new Ed25519 keypair instance.
     * Generate random keypair if no {@link Ed25519Keypair} is provided.
     *
     * @param keypair Ed25519 keypair
     */
    constructor(keypair) {
      super();
      if (keypair) {
        this.keypair = {
          publicKey: keypair.publicKey,
          secretKey: keypair.secretKey.slice(0, 32)
        };
      } else {
        const privateKey = ed25519.utils.randomPrivateKey();
        this.keypair = {
          publicKey: ed25519.getPublicKey(privateKey),
          secretKey: privateKey
        };
      }
    }
    /**
     * Get the key scheme of the keypair ED25519
     */
    getKeyScheme() {
      return "ED25519";
    }
    /**
     * Generate a new random Ed25519 keypair
     */
    static generate() {
      const secretKey = ed25519.utils.randomPrivateKey();
      return new _Ed25519Keypair({
        publicKey: ed25519.getPublicKey(secretKey),
        secretKey
      });
    }
    /**
     * Create a Ed25519 keypair from a raw secret key byte array, also known as seed.
     * This is NOT the private scalar which is result of hashing and bit clamping of
     * the raw secret key.
     *
     * @throws error if the provided secret key is invalid and validation is not skipped.
     *
     * @param secretKey secret key as a byte array or Bech32 secret key string
     * @param options: skip secret key validation
     */
    static fromSecretKey(secretKey, options) {
      if (typeof secretKey === "string") {
        const decoded = decodeSuiPrivateKey(secretKey);
        if (decoded.schema !== "ED25519") {
          throw new Error(`Expected a ED25519 keypair, got ${decoded.schema}`);
        }
        return this.fromSecretKey(decoded.secretKey, options);
      }
      const secretKeyLength = secretKey.length;
      if (secretKeyLength !== PRIVATE_KEY_SIZE) {
        throw new Error(
          `Wrong secretKey size. Expected ${PRIVATE_KEY_SIZE} bytes, got ${secretKeyLength}.`
        );
      }
      const keypair = {
        publicKey: ed25519.getPublicKey(secretKey),
        secretKey
      };
      if (!options || !options.skipValidation) {
        const encoder = new TextEncoder();
        const signData = encoder.encode("sui validation");
        const signature = ed25519.sign(signData, secretKey);
        if (!ed25519.verify(signature, signData, keypair.publicKey)) {
          throw new Error("provided secretKey is invalid");
        }
      }
      return new _Ed25519Keypair(keypair);
    }
    /**
     * The public key for this Ed25519 keypair
     */
    getPublicKey() {
      return new Ed25519PublicKey(this.keypair.publicKey);
    }
    /**
     * The Bech32 secret key string for this Ed25519 keypair
     */
    getSecretKey() {
      return encodeSuiPrivateKey(
        this.keypair.secretKey.slice(0, PRIVATE_KEY_SIZE),
        this.getKeyScheme()
      );
    }
    /**
     * Return the signature for the provided data using Ed25519.
     */
    async sign(data) {
      return ed25519.sign(data, this.keypair.secretKey);
    }
    /**
     * Derive Ed25519 keypair from mnemonics and path. The mnemonics must be normalized
     * and validated against the english wordlist.
     *
     * If path is none, it will default to m/44'/784'/0'/0'/0', otherwise the path must
     * be compliant to SLIP-0010 in form m/44'/784'/{account_index}'/{change_index}'/{address_index}'.
     */
    static deriveKeypair(mnemonics, path) {
      if (path == null) {
        path = DEFAULT_ED25519_DERIVATION_PATH;
      }
      if (!isValidHardenedPath(path)) {
        throw new Error("Invalid derivation path");
      }
      const { key } = derivePath(path, mnemonicToSeedHex(mnemonics));
      return _Ed25519Keypair.fromSecretKey(key);
    }
    /**
     * Derive Ed25519 keypair from mnemonicSeed and path.
     *
     * If path is none, it will default to m/44'/784'/0'/0'/0', otherwise the path must
     * be compliant to SLIP-0010 in form m/44'/784'/{account_index}'/{change_index}'/{address_index}'.
     */
    static deriveKeypairFromSeed(seedHex, path) {
      if (path == null) {
        path = DEFAULT_ED25519_DERIVATION_PATH;
      }
      if (!isValidHardenedPath(path)) {
        throw new Error("Invalid derivation path");
      }
      const { key } = derivePath(path, seedHex);
      return _Ed25519Keypair.fromSecretKey(key);
    }
  };

  // node_modules/@wallet-standard/app/lib/esm/wallets.js
  var __classPrivateFieldGet = function(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  var _AppReadyEvent_detail;
  var wallets = void 0;
  var registeredWalletsSet = /* @__PURE__ */ new Set();
  function addRegisteredWallet(wallet) {
    cachedWalletsArray = void 0;
    registeredWalletsSet.add(wallet);
  }
  function removeRegisteredWallet(wallet) {
    cachedWalletsArray = void 0;
    registeredWalletsSet.delete(wallet);
  }
  var listeners = {};
  function getWallets() {
    if (wallets)
      return wallets;
    wallets = Object.freeze({ register, get, on });
    if (typeof window === "undefined")
      return wallets;
    const api = Object.freeze({ register });
    try {
      window.addEventListener("wallet-standard:register-wallet", ({ detail: callback }) => callback(api));
    } catch (error) {
      console.error("wallet-standard:register-wallet event listener could not be added\n", error);
    }
    try {
      window.dispatchEvent(new AppReadyEvent(api));
    } catch (error) {
      console.error("wallet-standard:app-ready event could not be dispatched\n", error);
    }
    return wallets;
  }
  function register(...wallets2) {
    wallets2 = wallets2.filter((wallet) => !registeredWalletsSet.has(wallet));
    if (!wallets2.length)
      return () => {
      };
    wallets2.forEach((wallet) => addRegisteredWallet(wallet));
    listeners["register"]?.forEach((listener) => guard(() => listener(...wallets2)));
    return function unregister() {
      wallets2.forEach((wallet) => removeRegisteredWallet(wallet));
      listeners["unregister"]?.forEach((listener) => guard(() => listener(...wallets2)));
    };
  }
  var cachedWalletsArray;
  function get() {
    if (!cachedWalletsArray) {
      cachedWalletsArray = [...registeredWalletsSet];
    }
    return cachedWalletsArray;
  }
  function on(event, listener) {
    listeners[event]?.push(listener) || (listeners[event] = [listener]);
    return function off() {
      listeners[event] = listeners[event]?.filter((existingListener) => listener !== existingListener);
    };
  }
  function guard(callback) {
    try {
      callback();
    } catch (error) {
      console.error(error);
    }
  }
  var AppReadyEvent = class extends Event {
    get detail() {
      return __classPrivateFieldGet(this, _AppReadyEvent_detail, "f");
    }
    get type() {
      return "wallet-standard:app-ready";
    }
    constructor(api) {
      super("wallet-standard:app-ready", {
        bubbles: false,
        cancelable: false,
        composed: false
      });
      _AppReadyEvent_detail.set(this, void 0);
      __classPrivateFieldSet(this, _AppReadyEvent_detail, api, "f");
    }
    /** @deprecated */
    preventDefault() {
      throw new Error("preventDefault cannot be called");
    }
    /** @deprecated */
    stopImmediatePropagation() {
      throw new Error("stopImmediatePropagation cannot be called");
    }
    /** @deprecated */
    stopPropagation() {
      throw new Error("stopPropagation cannot be called");
    }
  };
  _AppReadyEvent_detail = /* @__PURE__ */ new WeakMap();

  // sui-bridge.js
  window.SuiSDK = { SuiClient, Transaction, Inputs, Ed25519Keypair, decodeSuiPrivateKey, getWallets };
})();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/utils.js:
@noble/curves/esm/abstract/modular.js:
@noble/curves/esm/abstract/curve.js:
@noble/curves/esm/abstract/edwards.js:
@noble/curves/esm/ed25519.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@scure/bip39/esm/index.js:
  (*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) *)
*/
