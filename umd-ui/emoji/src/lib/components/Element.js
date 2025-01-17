﻿import objectAssign$1 from '@lib/common/objectassign';
import { emptyObject, emptyFunction } from '@lib/common/emptyFn';

var invariant = function () {

};

function warnNoop(publicInstance, callerName) {
    {
        var constructor = publicInstance.constructor;
    }
}

/**
 * This is the abstract API for an update queue.
 */
const $NoopUpdateQueue = {
    /**
     * Checks whether or not this composite component is mounted.
     * @param {UmdClass} publicInstance The instance we want to test.
     * @return {boolean} True if mounted, false otherwise.
     * @protected
     * @final
     */
    isMounted: function (publicInstance) {
        return false;
    },

    /**
     * Forces an update. This should only be invoked when it is known with
     * certainty that we are **not** in a DOM transaction.
     *
     * You may want to call this when you know that some deeper aspect of the
     * component's state has changed but `setState` was not called.
     *
     * This will not invoke `shouldComponentUpdate`, but it will invoke
     * `componentWillUpdate` and `componentDidUpdate`.
     *
     * @param {UmdClass} publicInstance The instance that should rerender.
     * @param {?function} callback Called after component is updated.
     * @param {?string} callerName name of the calling function in the public API.
     * @internal
     */
    enqueueForceUpdate: function (publicInstance, callback, callerName) {
        warnNoop(publicInstance, 'forceUpdate');
    },

    /**
     * Replaces all of the state. Always use this or `setState` to mutate state.
     * You should treat `this.state` as immutable.
     *
     * There is no guarantee that `this.state` will be immediately updated, so
     * accessing `this.state` after calling this method may return the old value.
     *
     * @param {UmdClass} publicInstance The instance that should rerender.
     * @param {object} completeState Next state.
     * @param {?function} callback Called after component is updated.
     * @param {?string} callerName name of the calling function in the public API.
     * @internal
     */
    enqueueReplaceState: function (publicInstance, completeState, callback, callerName) {
        warnNoop(publicInstance, 'replaceState');
    },

    /**
     * Sets a subset of the state. This only exists because _pendingState is
     * internal. This provides a merging strategy that is not available to deep
     * properties which is confusing. TODO: Expose pendingState or don't use it
     * during the merge.
     *
     * @param {UmdClass} publicInstance The instance that should rerender.
     * @param {object} partialState Next partial state to be merged with state.
     * @param {?function} callback Called after component is updated.
     * @param {?string} Name of the calling function in the public API.
     * @internal
     */
    enqueueSetState: function (publicInstance, partialState, callback, callerName) {
        warnNoop(publicInstance, 'setState');
    }
};


/**
 * Base class helpers for the updating state of a component.
 */
function UmdComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    // We initialize the default updater but the real one gets injected by the
    // renderer.
    this.updater = updater || $NoopUpdateQueue;
}

UmdComponent.prototype.isUmdComponent = {};

/**
 * Sets a subset of the state. Always use this to mutate
 * state. You should treat `this.state` as immutable.
 *
 * There is no guarantee that `this.state` will be immediately updated, so
 * accessing `this.state` after calling this method may return the old value.
 *
 * There is no guarantee that calls to `setState` will run synchronously,
 * as they may eventually be batched together.  You can provide an optional
 * callback that will be executed when the call to setState is actually
 * completed.
 *
 * When a function is provided to setState, it will be called at some point in
 * the future (not synchronously). It will be called with the up to date
 * component arguments (state, props, context). These values can be different
 * from this.* because your function may be called after receiveProps but before
 * shouldComponentUpdate, and this new state, props, and context will not yet be
 * assigned to this.
 *
 * @param {object|function} partialState Next partial state or function to
 *        produce next partial state to be merged with current state.
 * @param {?function} callback Called after state is updated.
 * @final
 * @protected
 */
UmdComponent.prototype.setState = function (partialState, callback) {
    !(typeof partialState === 'object' || typeof partialState === 'function' || partialState == null) ? invariant(false, 'setState(...): takes an object of state variables to update or a function which returns an object of state variables.') : void 0;
    this.updater.enqueueSetState(this, partialState, callback, 'setState');
};

/**
 * Forces an update. This should only be invoked when it is known with
 * certainty that we are **not** in a DOM transaction.
 *
 * You may want to call this when you know that some deeper aspect of the
 * component's state has changed but `setState` was not called.
 *
 * This will not invoke `shouldComponentUpdate`, but it will invoke
 * `componentWillUpdate` and `componentDidUpdate`.
 *
 * @param {?function} callback Called after update is complete.
 * @final
 * @protected
 */
UmdComponent.prototype.forceUpdate = function (callback) {
    this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

/**
 * Deprecated APIs. These APIs used to exist on classic Umd classes but since
 * we would like to deprecate them, we're not going to move them over to this
 * modern base class. Instead, we define a getter that warns if it's accessed.
 */
{
    var deprecatedAPIs = {
        isMounted: ['isMounted', 'Instead, make sure to clean up subscriptions and pending requests in ' + 'componentWillUnmount to prevent memory leaks.'],
        replaceState: ['replaceState', 'Refactor your code to use setState instead']
    };
    var defineDeprecationWarning = function (methodName, info) {
        Object.defineProperty(UmdComponent.prototype, methodName, {
            get: function () {
                return undefined;
            }
        });
    };
    for (var fnName in deprecatedAPIs) {
        if (deprecatedAPIs.hasOwnProperty(fnName)) {
            defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        }
    }
}

/**
 * Base class helpers for the updating state of a component.
 */
function UmdPureComponent(props, context, updater) {
    // Duplicated from UmdComponent.
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    // We initialize the default updater but the real one gets injected by the
    // renderer.
    this.updater = updater || $NoopUpdateQueue;
}

function ComponentDummy() { }
ComponentDummy.prototype = UmdComponent.prototype;
var pureComponentPrototype = UmdPureComponent.prototype = new ComponentDummy();
pureComponentPrototype.constructor = UmdPureComponent;
// Avoid an extra prototype jump for these methods.
objectAssign$1(pureComponentPrototype, UmdComponent.prototype);
pureComponentPrototype.isPureUmdComponent = true;

function UmdAsyncComponent(props, context, updater) {
    // Duplicated from UmdComponent.
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    // We initialize the default updater but the real one gets injected by the
    // renderer.
    this.updater = updater || $NoopUpdateQueue;
}

var asyncComponentPrototype = UmdAsyncComponent.prototype = new ComponentDummy();
asyncComponentPrototype.constructor = UmdAsyncComponent;
// Avoid an extra prototype jump for these methods.
objectAssign$1(asyncComponentPrototype, UmdComponent.prototype);
asyncComponentPrototype.unstable_isAsyncUmdComponent = true;
asyncComponentPrototype.render = function () {
    return this.props.children;
};

var UmdBaseClasses = {
    Component: UmdComponent,
    PureComponent: UmdPureComponent,
    AsyncComponent: UmdAsyncComponent
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdCurrentOwner
 * 
 */

/**
 * Keeps track of the current owner.
 *
 * The current owner is the component who should own any components that are
 * currently being constructed.
 */
var UmdCurrentOwner = {
    /**
     * @internal
     * @type {UmdComponent}
     */
    current: null
};

var UmdCurrentOwner_1 = UmdCurrentOwner;

var hasOwnProperty = Object.prototype.hasOwnProperty;

// The Symbol used to tag the UmdElement type. If there is no native Symbol
// nor polyfill, then a plain number is used for performance.
var REACT_ELEMENT_TYPE$1 = typeof Symbol === 'function' && Symbol['for'] && Symbol['for']('umd.element') || 0xeac7;

var RESERVED_PROPS = {
    key: true,
    ref: true,
    __self: true,
    __source: true
};

function hasValidRef(config) {
    {
        if (hasOwnProperty.call(config, 'ref')) {
            var getter = Object.getOwnPropertyDescriptor(config, 'ref').get;
            if (getter && getter.isUmdWarning) {
                return false;
            }
        }
    }
    return config.ref !== undefined;
}

function hasValidKey(config) {
    {
        if (hasOwnProperty.call(config, 'key')) {
            var getter = Object.getOwnPropertyDescriptor(config, 'key').get;
            if (getter && getter.isUmdWarning) {
                return false;
            }
        }
    }
    return config.key !== undefined;
}





/**
 * Factory method to create a new Umd element. This no longer adheres to
 * the class pattern, so do not use new to call it. Also, no instanceof check
 * will work. Instead test $$typeof field against Symbol.for('umd.element') to check
 * if something is a Umd Element.
 *
 * @param {*} type
 * @param {*} key
 * @param {string|object} ref
 * @param {*} self A *temporary* helper to detect places where `this` is
 * different from the `owner` when Umd.createElement is called, so that we
 * can warn. We want to get rid of owner and replace string `ref`s with arrow
 * functions, and as long as `this` and owner are the same, there will be no
 * change in behavior.
 * @param {*} source An annotation object (added by a transpiler or otherwise)
 * indicating filename, line number, and/or other information.
 * @param {*} owner
 * @param {*} props
 * @internal
 */
var UmdElement = function (type, key, ref, self, source, owner, props) {
    var element = {
        // This tag allow us to uniquely identify this as a Umd Element
        $$typeof: REACT_ELEMENT_TYPE$1,

        // Built-in properties that belong on the element
        type: type,
        key: key,
        ref: ref,
        props: props,

        // Record the component responsible for creating this element.
        _owner: owner
    };

    {
        // The validation flag is currently mutative. We put it on
        // an external backing store so that we can freeze the whole object.
        // This can be replaced with a WeakMap once they are implemented in
        // commonly used development environments.
        element._store = {};

        // To make comparing UmdElements easier for testing purposes, we make
        // the validation flag non-enumerable (where possible, which should
        // include every environment we run tests in), so the test framework
        // ignores it.
        Object.defineProperty(element._store, 'validated', {
            configurable: false,
            enumerable: false,
            writable: true,
            value: false
        });
        // self and source are DEV only properties.
        Object.defineProperty(element, '_self', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: self
        });
        // Two elements created in two different places should be considered
        // equal for testing purposes and therefore we hide it from enumeration.
        Object.defineProperty(element, '_source', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: source
        });
        if (Object.freeze) {
            Object.freeze(element.props);
            Object.freeze(element);
        }
    }

    return element;
};

UmdElement.createElement = function (type, config, children) {
    var propName;

    // Reserved names are extracted
    var props = {};

    var key = null;
    var ref = null;
    var self = null;
    var source = null;

    if (config != null) {
        if (hasValidRef(config)) {
            ref = config.ref;
        }
        if (hasValidKey(config)) {
            key = '' + config.key;
        }

        self = config.__self === undefined ? null : config.__self;
        source = config.__source === undefined ? null : config.__source;
        // Remaining properties are added to a new props object
        for (propName in config) {
            if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
            }
        }
    }

    // Children can be more than one argument, and those are transferred onto
    // the newly allocated props object.
    var childrenLength = arguments.length - 2;
    if (childrenLength === 1) {
        props.children = children;
    } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
            childArray[i] = arguments[i + 2];
        }
        {
            if (Object.freeze) {
                Object.freeze(childArray);
            }
        }
        props.children = childArray;
    }

    // Resolve default props
    if (type && type.defaultProps) {
        var defaultProps = type.defaultProps;
        for (propName in defaultProps) {
            if (props[propName] === undefined) {
                props[propName] = defaultProps[propName];
            }
        }
    }

    return UmdElement(type, key, ref, self, source, UmdCurrentOwner_1.current, props);
};

UmdElement.createFactory = function (type) {
    var factory = UmdElement.createElement.bind(null, type);
    // Expose the type on the factory and the prototype so that it can be
    // easily accessed on elements. E.g. `<Foo />.type === Foo`.
    // This should not be named `constructor` since this may not be the function
    // that created the element, and it may not even be a constructor.
    // Legacy hook TODO: Warn if this is accessed
    factory.type = type;
    return factory;
};

UmdElement.cloneAndReplaceKey = function (oldElement, newKey) {
    var newElement = UmdElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);

    return newElement;
};


UmdElement.cloneElement = function (element, config, children) {
    var propName;

    // Original props are copied
    var props = objectAssign$1({}, element.props);

    // Reserved names are extracted
    var key = element.key;
    var ref = element.ref;
    // Self is preserved since the owner is preserved.
    var self = element._self;
    // Source is preserved since cloneElement is unlikely to be targeted by a
    // transpiler, and the original source is probably a better indicator of the
    // true owner.
    var source = element._source;

    // Owner will be preserved, unless ref is overridden
    var owner = element._owner;

    if (config != null) {
        if (hasValidRef(config)) {
            // Silently steal the ref from the parent.
            ref = config.ref;
            owner = UmdCurrentOwner_1.current;
        }
        if (hasValidKey(config)) {
            key = '' + config.key;
        }

        // Remaining properties override existing props
        var defaultProps;
        if (element.type && element.type.defaultProps) {
            defaultProps = element.type.defaultProps;
        }
        for (propName in config) {
            if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === undefined && defaultProps !== undefined) {
                    // Resolve default props
                    props[propName] = defaultProps[propName];
                } else {
                    props[propName] = config[propName];
                }
            }
        }
    }

    // Children can be more than one argument, and those are transferred onto
    // the newly allocated props object.
    var childrenLength = arguments.length - 2;
    if (childrenLength === 1) {
        props.children = children;
    } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
            childArray[i] = arguments[i + 2];
        }
        props.children = childArray;
    }

    return UmdElement(element.type, key, ref, self, source, owner, props);
};


UmdElement.isValidElement = function (object) {
    return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE$1;
};

var UmdElement_1 = UmdElement;


var UmdDebugCurrentFrame = {};

{
    // Component that is being worked on
    UmdDebugCurrentFrame.getCurrentStack = null;

    UmdDebugCurrentFrame.getStackAddendum = function () {
        var impl = UmdDebugCurrentFrame.getCurrentStack;
        if (impl) {
            return impl();
        }
        return null;
    };
}

var UmdDebugCurrentFrame_1 = UmdDebugCurrentFrame;

{
    var _require = UmdDebugCurrentFrame_1,
        getStackAddendum = _require.getStackAddendum;
}

var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.
// The Symbol used to tag the UmdElement type. If there is no native Symbol
// nor polyfill, then a plain number is used for performance.
var REACT_ELEMENT_TYPE = typeof Symbol === 'function' && Symbol['for'] && Symbol['for']('umd.element') || 0xeac7;

var SEPARATOR = '.';
var SUBSEPARATOR = ':';


function escape(key) {
    var escapeRegex = /[=:]/g;
    var escaperLookup = {
        '=': '=0',
        ':': '=2'
    };
    var escapedString = ('' + key).replace(escapeRegex, function (match) {
        return escaperLookup[match];
    });

    return "$" + escapedString;
}

/**
 * TODO: Test that a single child and an array with one item have the same key
 * pattern.
 */

var didWarnAboutMaps = false;

var userProvidedKeyEscapeRegex = /\/+/g;
function escapeUserProvidedKey(text) {
    return ('' + text).replace(userProvidedKeyEscapeRegex, '$&/');
}

var POOL_SIZE = 10;
var traverseContextPool = [];
function getPooledTraverseContext(mapResult, keyPrefix, mapFunction, mapContext) {
    if (traverseContextPool.length) {
        var traverseContext = traverseContextPool.pop();
        traverseContext.result = mapResult;
        traverseContext.keyPrefix = keyPrefix;
        traverseContext.func = mapFunction;
        traverseContext.context = mapContext;
        traverseContext.count = 0;
        return traverseContext;
    } else {
        return {
            result: mapResult,
            keyPrefix: keyPrefix,
            func: mapFunction,
            context: mapContext,
            count: 0
        };
    }
}

function releaseTraverseContext(traverseContext) {
    traverseContext.result = null;
    traverseContext.keyPrefix = null;
    traverseContext.func = null;
    traverseContext.context = null;
    traverseContext.count = 0;
    if (traverseContextPool.length < POOL_SIZE) {
        traverseContextPool.push(traverseContext);
    }
}

/**
 * @param {?*} children Children tree container.
 * @param {!string} nameSoFar Name of the key path so far.
 * @param {!function} callback Callback to invoke with each child found.
 * @param {?*} traverseContext Used to pass information throughout the traversal
 * process.
 * @return {!number} The number of children in this subtree.
 */
function traverseAllChildrenImpl(children, nameSoFar, callback, traverseContext) {
    var type = typeof children;

    if (type === 'undefined' || type === 'boolean') {
        // All of the above are perceived as null.
        children = null;
    }

    if (children === null || type === 'string' || type === 'number' ||
        // The following is inlined from UmdElement. This means we can optimize
        // some checks. Umd Fiber also inlines this logic for similar purposes.
        type === 'object' && children.$$typeof === REACT_ELEMENT_TYPE) {
        callback(traverseContext, children,
            // If it's the only child, treat the name as if it was wrapped in an array
            // so that it's consistent if the number of children grows.
            nameSoFar === '' ? SEPARATOR + getComponentKey(children, 0) : nameSoFar);
        return 1;
    }

    var child;
    var nextName;
    var subtreeCount = 0; // Count of children found in the current subtree.
    var nextNamePrefix = nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

    if (Array.isArray(children)) {
        for (var i = 0; i < children.length; i++) {
            child = children[i];
            nextName = nextNamePrefix + getComponentKey(child, i);
            subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
        }
    } else {
        var iteratorFn = ITERATOR_SYMBOL && children[ITERATOR_SYMBOL] || children[FAUX_ITERATOR_SYMBOL];
        if (typeof iteratorFn === 'function') {
            {
                // Warn about using Maps as children
                if (iteratorFn === children.entries) {
                    didWarnAboutMaps = true;
                }
            }

            var iterator = iteratorFn.call(children);
            var step;
            var ii = 0;
            while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getComponentKey(child, ii++);
                subtreeCount += traverseAllChildrenImpl(child, nextName, callback, traverseContext);
            }
        } else if (type === 'object') {
            var addendum = '';
            {
                addendum = ' If you meant to render a collection of children, use an array ' + 'instead.' + getStackAddendum();
            }
            var childrenString = '' + children;
            invariant(false, 'Objects are not valid as a Umd child (found: %s).%s', childrenString === '[object Object]' ? 'object with keys {' + Object.keys(children).join(', ') + '}' : childrenString, addendum);
        }
    }

    return subtreeCount;
}

/**
 * Traverses children that are typically specified as `props.children`, but
 * might also be specified through attributes:
 *
 * - `traverseAllChildren(this.props.children, ...)`
 * - `traverseAllChildren(this.props.leftPanelChildren, ...)`
 *
 * The `traverseContext` is an optional argument that is passed through the
 * entire traversal. It can be used to store accumulations or anything else that
 * the callback might find relevant.
 *
 * @param {?*} children Children tree object.
 * @param {!function} callback To invoke upon traversing each child.
 * @param {?*} traverseContext Context for traversal.
 * @return {!number} The number of children in this subtree.
 */
function traverseAllChildren(children, callback, traverseContext) {
    if (children == null) {
        return 0;
    }

    return traverseAllChildrenImpl(children, '', callback, traverseContext);
}

/**
 * Generate a key string that identifies a component within a set.
 *
 * @param {*} component A component that could contain a manual key.
 * @param {number} index Index that is used if a manual key is not provided.
 * @return {string}
 */
function getComponentKey(component, index) {
    // Do some typechecking here since we call this blindly. We want to ensure
    // that we don't block potential future ES APIs.
    if (typeof component === 'object' && component !== null && component.key != null) {
        // Explicit key
        return escape(component.key);
    }
    // Implicit key determined by the index in the set
    return index.toString(36);
}

function forEachSingleChild(bookKeeping, child, name) {
    var func = bookKeeping.func,
        context = bookKeeping.context;

    func.call(context, child, bookKeeping.count++);
}

function forEachChildren(children, forEachFunc, forEachContext) {
    if (children == null) {
        return children;
    }
    var traverseContext = getPooledTraverseContext(null, null, forEachFunc, forEachContext);
    traverseAllChildren(children, forEachSingleChild, traverseContext);
    releaseTraverseContext(traverseContext);
}

function mapSingleChildIntoContext(bookKeeping, child, childKey) {
    var result = bookKeeping.result,
        keyPrefix = bookKeeping.keyPrefix,
        func = bookKeeping.func,
        context = bookKeeping.context;


    var mappedChild = func.call(context, child, bookKeeping.count++);
    if (Array.isArray(mappedChild)) {
        mapIntoWithKeyPrefixInternal(mappedChild, result, childKey, emptyFunction.thatReturnsArgument);
    } else if (mappedChild != null) {
        if (UmdElement_1.isValidElement(mappedChild)) {
            mappedChild = UmdElement_1.cloneAndReplaceKey(mappedChild,
                // Keep both the (mapped) and old keys if they differ, just as
                // traverseAllChildren used to do for objects as children
                keyPrefix + (mappedChild.key && (!child || child.key !== mappedChild.key) ? escapeUserProvidedKey(mappedChild.key) + '/' : '') + childKey);
        }
        result.push(mappedChild);
    }
}

function mapIntoWithKeyPrefixInternal(children, array, prefix, func, context) {
    var escapedPrefix = '';
    if (prefix != null) {
        escapedPrefix = escapeUserProvidedKey(prefix) + '/';
    }
    var traverseContext = getPooledTraverseContext(array, escapedPrefix, func, context);
    traverseAllChildren(children, mapSingleChildIntoContext, traverseContext);
    releaseTraverseContext(traverseContext);
}

function mapChildren(children, func, context) {
    if (children == null) {
        return children;
    }
    var result = [];
    mapIntoWithKeyPrefixInternal(children, result, null, func, context);
    return result;
}

function countChildren(children, context) {
    return traverseAllChildren(children, emptyFunction.thatReturnsNull, null);
}


function toArray(children) {
    var result = [];
    mapIntoWithKeyPrefixInternal(children, result, null, emptyFunction.thatReturnsArgument);
    return result;
}

var UmdChildren = {
    forEach: forEachChildren,
    map: mapChildren,
    count: countChildren,
    toArray: toArray
};

var UmdChildren_1 = UmdChildren;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdVersion
 */

var UmdVersion = '16.0.0';


function onlyChild(children) {
    !UmdElement_1.isValidElement(children) ? invariant(false, 'Umd.Children.only expected to receive a single Umd element child.') : void 0;
    return children;
}

var onlyChild_1 = onlyChild;

/**
 * Copyright (c) 2016-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @providesModule describeComponentFrame
 */

var describeComponentFrame$1 = function (name, source, ownerName) {
    return '\n    in ' + (name || 'Unknown') + (source ? ' (at ' + source.fileName.replace(/^.*[\\\/]/, '') + ':' + source.lineNumber + ')' : ownerName ? ' (created by ' + ownerName + ')' : '');
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule getComponentName
 * 
 */

function getComponentName$1(instanceOrFiber) {
    if (typeof instanceOrFiber.getName === 'function') {
        // Stack reconciler
        var instance = instanceOrFiber;
        return instance.getName();
    }
    if (typeof instanceOrFiber.tag === 'number') {
        // Fiber reconciler
        var fiber = instanceOrFiber;
        var type = fiber.type;

        if (typeof type === 'string') {
            return type;
        }
        if (typeof type === 'function') {
            return type.displayName || type.name;
        }
    }
    return null;
}

var getComponentName_1 = getComponentName$1;

{



    var UmdDebugCurrentFrame$1 = UmdDebugCurrentFrame_1;
    var describeComponentFrame = describeComponentFrame$1;
    var getComponentName = getComponentName_1;

    var currentlyValidatingElement = null;

    var getDisplayName = function (element) {
        if (element == null) {
            return '#empty';
        } else if (typeof element === 'string' || typeof element === 'number') {
            return '#text';
        } else if (typeof element.type === 'string') {
            return element.type;
        } else {
            return element.type.displayName || element.type.name || 'Unknown';
        }
    };

    var getStackAddendum$1 = function () {
        var stack = '';
        if (currentlyValidatingElement) {
            var name = getDisplayName(currentlyValidatingElement);
            var owner = currentlyValidatingElement._owner;
            stack += describeComponentFrame(name, currentlyValidatingElement._source, owner && getComponentName(owner));
        }
        stack += UmdDebugCurrentFrame$1.getStackAddendum() || '';
        return stack;
    };
}

var ITERATOR_SYMBOL$1 = typeof Symbol === 'function' && Symbol.iterator;
var FAUX_ITERATOR_SYMBOL$1 = '@@iterator'; // Before Symbol spec.

function getDeclarationErrorAddendum() {
    if (UmdCurrentOwner_1.current) {
        var name = getComponentName(UmdCurrentOwner_1.current);
        if (name) {
            return '\n\nCheck the render method of `' + name + '`.';
        }
    }
    return '';
}

function getSourceInfoErrorAddendum(elementProps) {
    if (elementProps !== null && elementProps !== undefined && elementProps.__source !== undefined) {
        var source = elementProps.__source;
        var fileName = source.fileName.replace(/^.*[\\\/]/, '');
        var lineNumber = source.lineNumber;
        return '\n\nCheck your code at ' + fileName + ':' + lineNumber + '.';
    }
    return '';
}

/**
 * Warn if there's no key explicitly set on dynamic arrays of children or
 * object keys are not valid. This allows us to keep track of children between
 * updates.
 */
var ownerHasKeyUseWarning = {};

function getCurrentComponentErrorInfo(parentType) {
    var info = getDeclarationErrorAddendum();

    if (!info) {
        var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;
        if (parentName) {
            info = '\n\nCheck the top-level render call using <' + parentName + '>.';
        }
    }
    return info;
}

/**
 * Warn if the element doesn't have an explicit key assigned to it.
 * This element is in an array. The array could grow and shrink or be
 * reordered. All children that haven't already been validated are required to
 * have a "key" property assigned to it. Error statuses are cached so a warning
 * will only be shown once.
 *
 * @internal
 * @param {UmdElement} element Element that requires a key.
 * @param {*} parentType element's parent's type.
 */
function validateExplicitKey(element, parentType) {
    if (!element._store || element._store.validated || element.key != null) {
        return;
    }
    element._store.validated = true;

    var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
    if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
        return;
    }
    ownerHasKeyUseWarning[currentComponentErrorInfo] = true;

    // Usually the current owner is the offender, but if it accepts children as a
    // property, it may be the creator of the child that's responsible for
    // assigning it a key.
    var childOwner = '';
    if (element && element._owner && element._owner !== UmdCurrentOwner_1.current) {
        // Give the component that originally created this child.
        childOwner = ' It was passed a child from ' + getComponentName(element._owner) + '.';
    }

    currentlyValidatingElement = element;

    currentlyValidatingElement = null;
}

/**
 * Ensure that every element either is passed in a static location, in an
 * array with an explicit keys property defined, or in an object literal
 * with valid key property.
 *
 * @internal
 * @param {UmdNode} node Statically passed child of any type.
 * @param {*} parentType node's parent's type.
 */
function validateChildKeys(node, parentType) {
    if (typeof node !== 'object') {
        return;
    }
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var child = node[i];
            if (UmdElement_1.isValidElement(child)) {
                validateExplicitKey(child, parentType);
            }
        }
    } else if (UmdElement_1.isValidElement(node)) {
        // This element was passed in a valid location.
        if (node._store) {
            node._store.validated = true;
        }
    } else if (node) {
        var iteratorFn = ITERATOR_SYMBOL$1 && node[ITERATOR_SYMBOL$1] || node[FAUX_ITERATOR_SYMBOL$1];
        if (typeof iteratorFn === 'function') {
            // Entry iterators used to provide implicit keys,
            // but now we print a separate warning for them later.
            if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                    if (UmdElement_1.isValidElement(step.value)) {
                        validateExplicitKey(step.value, parentType);
                    }
                }
            }
        }
    }
}

function isNative(fn) {
    // Based on isNative() from Lodash
    var funcToString = Function.prototype.toString;
    var reIsNative = RegExp('^' + funcToString
        // Take an example native function source for comparison
        .call(Object.prototype.hasOwnProperty)
        // Strip regex characters so we can use it for regex
        .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
        // Remove hasOwnProperty from the template to make it generic
        .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + "$");
    try {
        var source = funcToString.call(fn);
        return reIsNative.test(source);
    } catch (err) {
        return false;
    }
}

var canUseCollections =
    // Array.from
    typeof Array.from === 'function' &&
    // Map
    typeof Map === 'function' && isNative(Map) &&
    // Map.prototype.keys
    Map.prototype != null && typeof Map.prototype.keys === 'function' && isNative(Map.prototype.keys) &&
    // Set
    typeof Set === 'function' && isNative(Set) &&
    // Set.prototype.keys
    Set.prototype != null && typeof Set.prototype.keys === 'function' && isNative(Set.prototype.keys);

var setItem;
var getItem;
var removeItem;
var getItemIDs;
var addRoot;
var removeRoot;
var getRootIDs;

if (canUseCollections) {
    var itemMap = new Map();
    var rootIDSet = new Set();

    setItem = function (id, item) {
        itemMap.set(id, item);
    };
    getItem = function (id) {
        return itemMap.get(id);
    };
    removeItem = function (id) {
        itemMap['delete'](id);
    };
    getItemIDs = function () {
        return Array.from(itemMap.keys());
    };

    addRoot = function (id) {
        rootIDSet.add(id);
    };
    removeRoot = function (id) {
        rootIDSet['delete'](id);
    };
    getRootIDs = function () {
        return Array.from(rootIDSet.keys());
    };
} else {
    var itemByKey = {};
    var rootByKey = {};

    var getKeyFromID = function (id) {
        return '.' + id;
    };
    var getIDFromKey = function (key) {
        return parseInt(key.substr(1), 10);
    };

    setItem = function (id, item) {
        var key = getKeyFromID(id);
        itemByKey[key] = item;
    };
    getItem = function (id) {
        var key = getKeyFromID(id);
        return itemByKey[key];
    };
    removeItem = function (id) {
        var key = getKeyFromID(id);
        delete itemByKey[key];
    };
    getItemIDs = function () {
        return Object.keys(itemByKey).map(getIDFromKey);
    };

    addRoot = function (id) {
        var key = getKeyFromID(id);
        rootByKey[key] = true;
    };
    removeRoot = function (id) {
        var key = getKeyFromID(id);
        delete rootByKey[key];
    };
    getRootIDs = function () {
        return Object.keys(rootByKey).map(getIDFromKey);
    };
}

var unmountedIDs = [];

function purgeDeep(id) {
    var item = getItem(id);
    if (item) {
        var childIDs = item.childIDs;

        removeItem(id);
        childIDs.forEach(purgeDeep);
    }
}

function getDisplayName$1(element) {
    if (element == null) {
        return '#empty';
    } else if (typeof element === 'string' || typeof element === 'number') {
        return '#text';
    } else if (typeof element.type === 'string') {
        return element.type;
    } else {
        return element.type.displayName || element.type.name || 'Unknown';
    }
}

function describeID(id) {
    var name = UmdComponentTreeHook.getDisplayName(id);
    var element = UmdComponentTreeHook.getElement(id);
    var ownerID = UmdComponentTreeHook.getOwnerID(id);
    var ownerName = void 0;

    if (ownerID) {
        ownerName = UmdComponentTreeHook.getDisplayName(ownerID);
    }
    return describeComponentFrame$1(name || '', element && element._source, ownerName || '');
}

var UmdComponentTreeHook = {
    onSetChildren: function (id, nextChildIDs) {
        var item = getItem(id);
        !item ? invariant(false, 'Item must have been set') : void 0;
        item.childIDs = nextChildIDs;

        for (var i = 0; i < nextChildIDs.length; i++) {
            var nextChildID = nextChildIDs[i];
            var nextChild = getItem(nextChildID);
            !nextChild ? invariant(false, 'Expected hook events to fire for the child before its parent includes it in onSetChildren().') : void 0;
            !(nextChild.childIDs != null || typeof nextChild.element !== 'object' || nextChild.element == null) ? invariant(false, 'Expected onSetChildren() to fire for a container child before its parent includes it in onSetChildren().') : void 0;
            !nextChild.isMounted ? invariant(false, 'Expected onMountComponent() to fire for the child before its parent includes it in onSetChildren().') : void 0;
            if (nextChild.parentID == null) {
                nextChild.parentID = id;
                // TODO: This shouldn't be necessary but mounting a new root during in
                // componentWillMount currently causes not-yet-mounted components to
                // be purged from our tree data so their parent id is missing.
            }
            !(nextChild.parentID === id) ? invariant(false, 'Expected onBeforeMountComponent() parent and onSetChildren() to be consistent (%s has parents %s and %s).', nextChildID, nextChild.parentID, id) : void 0;
        }
    },
    onBeforeMountComponent: function (id, element, parentID) {
        var item = {
            element: element,
            parentID: parentID,
            text: null,
            childIDs: [],
            isMounted: false,
            updateCount: 0
        };
        setItem(id, item);
    },
    onBeforeUpdateComponent: function (id, element) {
        var item = getItem(id);
        if (!item || !item.isMounted) {
            // We may end up here as a result of setState() in componentWillUnmount().
            // In this case, ignore the element.
            return;
        }
        item.element = element;
    },
    onMountComponent: function (id) {
        var item = getItem(id);
        !item ? invariant(false, 'Item must have been set') : void 0;
        item.isMounted = true;
        var isRoot = item.parentID === 0;
        if (isRoot) {
            addRoot(id);
        }
    },
    onUpdateComponent: function (id) {
        var item = getItem(id);
        if (!item || !item.isMounted) {
            // We may end up here as a result of setState() in componentWillUnmount().
            // In this case, ignore the element.
            return;
        }
        item.updateCount++;
    },
    onUnmountComponent: function (id) {
        var item = getItem(id);
        if (item) {
            // We need to check if it exists.
            // `item` might not exist if it is inside an error boundary, and a sibling
            // error boundary child threw while mounting. Then this instance never
            // got a chance to mount, but it still gets an unmounting event during
            // the error boundary cleanup.
            item.isMounted = false;
            var isRoot = item.parentID === 0;
            if (isRoot) {
                removeRoot(id);
            }
        }
        unmountedIDs.push(id);
    },
    purgeUnmountedComponents: function () {
        if (UmdComponentTreeHook._preventPurging) {
            // Should only be used for testing.
            return;
        }

        for (var i = 0; i < unmountedIDs.length; i++) {
            var id = unmountedIDs[i];
            purgeDeep(id);
        }
        unmountedIDs.length = 0;
    },
    isMounted: function (id) {
        var item = getItem(id);
        return item ? item.isMounted : false;
    },
    getCurrentStackAddendum: function () {
        var info = '';
        var currentOwner = UmdCurrentOwner_1.current;
        if (currentOwner) {
            !(typeof currentOwner.tag !== 'number') ? invariant(false, 'Fiber owners should not show up in Stack stack traces.') : void 0;
            if (typeof currentOwner._debugID === 'number') {
                info += UmdComponentTreeHook.getStackAddendumByID(currentOwner._debugID);
            }
        }
        return info;
    },
    getStackAddendumByID: function (id) {
        var info = '';
        while (id) {
            info += describeID(id);
            id = UmdComponentTreeHook.getParentID(id);
        }
        return info;
    },
    getChildIDs: function (id) {
        var item = getItem(id);
        return item ? item.childIDs : [];
    },
    getDisplayName: function (id) {
        var element = UmdComponentTreeHook.getElement(id);
        if (!element) {
            return null;
        }
        return getDisplayName$1(element);
    },
    getElement: function (id) {
        var item = getItem(id);
        return item ? item.element : null;
    },
    getOwnerID: function (id) {
        var element = UmdComponentTreeHook.getElement(id);
        if (!element || !element._owner) {
            return null;
        }
        return element._owner._debugID;
    },
    getParentID: function (id) {
        var item = getItem(id);
        return item ? item.parentID : null;
    },
    getSource: function (id) {
        var item = getItem(id);
        var element = item ? item.element : null;
        var source = element != null ? element._source : null;
        return source;
    },
    getText: function (id) {
        var element = UmdComponentTreeHook.getElement(id);
        if (typeof element === 'string') {
            return element;
        } else if (typeof element === 'number') {
            return '' + element;
        } else {
            return null;
        }
    },
    getUpdateCount: function (id) {
        var item = getItem(id);
        return item ? item.updateCount : 0;
    },


    getRootIDs: getRootIDs,
    getRegisteredIDs: getItemIDs
};

var UmdComponentTreeHook_1 = UmdComponentTreeHook;

var createElement = UmdElement_1.createElement;
var createFactory = UmdElement_1.createFactory;
var cloneElement = UmdElement_1.cloneElement;



var Umd = {
    Children: {
        map: UmdChildren_1.map,
        forEach: UmdChildren_1.forEach,
        count: UmdChildren_1.count,
        toArray: UmdChildren_1.toArray,
        only: onlyChild_1
    },

    Component: UmdBaseClasses.Component,
    PureComponent: UmdBaseClasses.PureComponent,
    unstable_AsyncComponent: UmdBaseClasses.AsyncComponent,

    createElement: createElement,
    cloneElement: cloneElement,
    isValidElement: UmdElement_1.isValidElement,

    createFactory: createFactory,

    version: UmdVersion,

    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
        UmdCurrentOwner: UmdCurrentOwner_1,
        // Used by renderers to avoid bundling object-assign twice in UMD bundles:
        assign: objectAssign$1
    }
};

{
    objectAssign$1(Umd.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, {
        // These should not be included in production.
        UmdComponentTreeHook: UmdComponentTreeHook_1,
        UmdDebugCurrentFrame: UmdDebugCurrentFrame_1
    });
}

export default Umd;



