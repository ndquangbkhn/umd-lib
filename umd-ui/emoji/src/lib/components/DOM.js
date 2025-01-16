
import { shallowEqual, hyphenateStyleName } from "@misa-umd/core"
import _assign from "@lib/common/objectassign";
import { focusNode, containsNode, getActiveElement } from "@lib/common/node";
import { emptyFunction, emptyObject } from "@lib/common/emptyfn";
import EventListener from "@lib/common/eventlistener";
import _element from "@lib/components/Element";
import _possibleStandardNames from "@lib/components/PossibleStandardNames";


let _canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement)

const ExecutionEnvironment = {
    canUseDOM: _canUseDOM,
    canUseWorkers: typeof Worker !== 'undefined',
    canUseEventListeners: _canUseDOM && !!(window.addEventListener || window.attachEvent),
    canUseViewport: _canUseDOM && !!window.screen,
    isInWorker: !_canUseDOM

};

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const Namespaces = {
    html: HTML_NAMESPACE,
    mathml: MATH_NAMESPACE,
    svg: SVG_NAMESPACE
};

function checkMask(value, bitmask) {
    return (value & bitmask) === bitmask;
}


// Assumes there is no parent namespace.
function getIntrinsicNamespace(type) {
    switch (type) {
        case 'svg':
            return SVG_NAMESPACE;
        case 'math':
            return MATH_NAMESPACE;
        default:
            return HTML_NAMESPACE;
    }
}

var getChildNamespace = function (parentNamespace, type) {
    if (parentNamespace == null || parentNamespace === HTML_NAMESPACE) {
        // No (or default) parent namespace: potential entry point.
        return getIntrinsicNamespace(type);
    }
    if (parentNamespace === SVG_NAMESPACE && type === 'foreignObject') {
        // We're leaving SVG.
        return HTML_NAMESPACE;
    }
    // By default, pass namespace below.
    return parentNamespace;
}


const DOMNamespaces = {
    Namespaces: Namespaces,
    getIntrinsicNamespace: getIntrinsicNamespace,
    getChildNamespace: getChildNamespace
};

/**
 * Injectable ordering of event plugins.
 */
let eventPluginOrder = null;

/**
 * Injectable mapping from names to event plugin modules.
 */
let namesToPlugins = {};

/**
 * Recomputes the plugin list using the injected plugins and plugin ordering.
 *
 * @private
 */
function recomputePluginOrdering() {
    if (!eventPluginOrder) {
        // Wait until an `eventPluginOrder` is injected.
        return;
    }
    for (var pluginName in namesToPlugins) {
        var pluginModule = namesToPlugins[pluginName];
        var pluginIndex = eventPluginOrder.indexOf(pluginName);
        if (EventPluginRegistry.plugins[pluginIndex]) {
            continue;
        }
        EventPluginRegistry.plugins[pluginIndex] = pluginModule;
        var publishedEvents = pluginModule.eventTypes;
        for (var eventName in publishedEvents) {
            !publishEventForPlugin(publishedEvents[eventName], pluginModule, eventName);
        }
    }
}

/**
 * Publishes an event so that it can be dispatched by the supplied plugin.
 *
 * @param {object} dispatchConfig Dispatch configuration for the event.
 * @param {object} PluginModule Plugin publishing the event.
 * @return {boolean} True if the event was successfully published.
 * @private
 */
function publishEventForPlugin(dispatchConfig, pluginModule, eventName) {
    EventPluginRegistry.eventNameDispatchConfigs[eventName] = dispatchConfig;

    var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;
    if (phasedRegistrationNames) {
        for (var phaseName in phasedRegistrationNames) {
            if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
                var phasedRegistrationName = phasedRegistrationNames[phaseName];
                publishRegistrationName(phasedRegistrationName, pluginModule, eventName);
            }
        }
        return true;
    } else if (dispatchConfig.registrationName) {
        publishRegistrationName(dispatchConfig.registrationName, pluginModule, eventName);
        return true;
    }
    return false;
}

/**
 * Publishes a registration name that is used to identify dispatched events.
 *
 * @param {string} registrationName Registration name to add.
 * @param {object} PluginModule Plugin publishing the event.
 * @private
 */
function publishRegistrationName(registrationName, pluginModule, eventName) {
    EventPluginRegistry.registrationNameModules[registrationName] = pluginModule;
    EventPluginRegistry.registrationNameDependencies[registrationName] = pluginModule.eventTypes[eventName].dependencies;

    {
        var lowerCasedName = registrationName.toLowerCase();
        EventPluginRegistry.possibleRegistrationNames[lowerCasedName] = registrationName;

        if (registrationName === 'onDoubleClick') {
            EventPluginRegistry.possibleRegistrationNames.ondblclick = registrationName;
        }
    }
}

/**
 * Registers plugins so that they can extract and dispatch events.
 *
 * @see {EventPluginHub}
 */
const EventPluginRegistry = {
    /**
     * Ordered list of injected plugins.
     */
    plugins: [],

    /**
     * Mapping from event name to dispatch config
     */
    eventNameDispatchConfigs: {},

    /**
     * Mapping from registration name to plugin module
     */
    registrationNameModules: {},

    /**
     * Mapping from registration name to event name
     */
    registrationNameDependencies: {},

    /**
     * Mapping from lowercase registration names to the properly cased version,
     * used to warn in the case of missing event handlers. Available
     * only in true.
     * @type {Object}
     */
    possibleRegistrationNames: {},
    // Trust the developer to only use possibleRegistrationNames in true

    /**
     * Injects an ordering of plugins (by plugin name). This allows the ordering
     * to be decoupled from injection of the actual plugins so that ordering is
     * always deterministic regardless of packaging, on-the-fly injection, etc.
     *
     * @param {array} InjectedEventPluginOrder
     * @internal
     * @see {EventPluginHub.injection.injectEventPluginOrder}
     */
    injectEventPluginOrder: function (injectedEventPluginOrder) {
        // Clone the ordering so it cannot be dynamically mutated.
        eventPluginOrder = Array.prototype.slice.call(injectedEventPluginOrder);
        recomputePluginOrdering();
    },

    /**
     * Injects plugins to be used by `EventPluginHub`. The plugin names must be
     * in the ordering injected by `injectEventPluginOrder`.
     *
     * Plugins can be injected as part of page initialization or on-the-fly.
     *
     * @param {object} injectedNamesToPlugins Map from names to plugin modules.
     * @internal
     * @see {EventPluginHub.injection.injectEventPluginsByName}
     */
    injectEventPluginsByName: function (injectedNamesToPlugins) {
        var isOrderingDirty = false;
        for (var pluginName in injectedNamesToPlugins) {
            if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
                continue;
            }
            var pluginModule = injectedNamesToPlugins[pluginName];
            if (!namesToPlugins.hasOwnProperty(pluginName) || namesToPlugins[pluginName] !== pluginModule) {
                namesToPlugins[pluginName] = pluginModule;
                isOrderingDirty = true;
            }
        }
        if (isOrderingDirty) {
            recomputePluginOrdering();
        }
    }
};

const EventPluginRegistry_1 = EventPluginRegistry;

// These attributes should be all lowercase to allow for
// case insensitive checks
const RESERVED_PROPS = {
    children: true,
    dangerouslySetInnerHTML: true,
    autoFocus: true,
    defaultValue: true,
    defaultChecked: true,
    innerHTML: true,
    suppressContentEditableWarning: true,
    style: true
};


const DOMPropertyInjection = {

    MUST_USE_PROPERTY: 0x1,
    HAS_BOOLEAN_VALUE: 0x4,
    HAS_NUMERIC_VALUE: 0x8,
    HAS_POSITIVE_NUMERIC_VALUE: 0x10 | 0x8,
    HAS_OVERLOADED_BOOLEAN_VALUE: 0x20,
    HAS_STRING_BOOLEAN_VALUE: 0x40,


    injectDOMPropertyConfig: function (domPropertyConfig) {
        var Injection = DOMPropertyInjection;
        var Properties = domPropertyConfig.Properties || {};
        var DOMAttributeNamespaces = domPropertyConfig.DOMAttributeNamespaces || {};
        var DOMAttributeNames = domPropertyConfig.DOMAttributeNames || {};
        var DOMMutationMethods = domPropertyConfig.DOMMutationMethods || {};

        for (var propName in Properties) {

            var lowerCased = propName.toLowerCase();
            var propConfig = Properties[propName];

            var propertyInfo = {
                attributeName: lowerCased,
                attributeNamespace: null,
                propertyName: propName,
                mutationMethod: null,

                mustUseProperty: checkMask(propConfig, Injection.MUST_USE_PROPERTY),
                hasBooleanValue: checkMask(propConfig, Injection.HAS_BOOLEAN_VALUE),
                hasNumericValue: checkMask(propConfig, Injection.HAS_NUMERIC_VALUE),
                hasPositiveNumericValue: checkMask(propConfig, Injection.HAS_POSITIVE_NUMERIC_VALUE),
                hasOverloadedBooleanValue: checkMask(propConfig, Injection.HAS_OVERLOADED_BOOLEAN_VALUE),
                hasStringBooleanValue: checkMask(propConfig, Injection.HAS_STRING_BOOLEAN_VALUE)
            };

            if (DOMAttributeNames.hasOwnProperty(propName)) {
                var attributeName = DOMAttributeNames[propName];

                propertyInfo.attributeName = attributeName;
            }

            if (DOMAttributeNamespaces.hasOwnProperty(propName)) {
                propertyInfo.attributeNamespace = DOMAttributeNamespaces[propName];
            }

            if (DOMMutationMethods.hasOwnProperty(propName)) {
                propertyInfo.mutationMethod = DOMMutationMethods[propName];
            }

            // Downcase references to whitelist properties to check for membership
            // without case-sensitivity. This allows the whitelist to pick up
            // `allowfullscreen`, which should be written using the property configuration
            // for `allowFullscreen`
            DOMProperty.properties[propName] = propertyInfo;
        }
    }
};

/* eslint-disable max-len */
const ATTRIBUTE_NAME_START_CHAR = ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
/* eslint-enable max-len */


const DOMProperty = {
    ID_ATTRIBUTE_NAME: 'data-umdid',
    ROOT_ATTRIBUTE_NAME: 'data-umdroot',

    ATTRIBUTE_NAME_START_CHAR: ATTRIBUTE_NAME_START_CHAR,
    ATTRIBUTE_NAME_CHAR: ATTRIBUTE_NAME_START_CHAR + '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040',
    properties: {},

    /**
     * Checks whether a property name is a writeable attribute.
     * @method
     */
    shouldSetAttribute: function (name, value) {
        if (DOMProperty.isReservedProp(name)) {
            return false;
        }
        if ((name[0] === 'o' || name[0] === 'O') && (name[1] === 'n' || name[1] === 'N')) {
            return false;
        }
        if (value === null) {
            return true;
        }
        switch (typeof value) {
            case 'boolean':
                return DOMProperty.shouldAttributeAcceptBooleanValue(name);
            case 'undefined':
            case 'number':
            case 'string':
            case 'object':
                return true;
            default:
                // function, symbol
                return false;
        }
    },

    getPropertyInfo: function (name) {
        return DOMProperty.properties.hasOwnProperty(name) ? DOMProperty.properties[name] : null;
    },
    shouldAttributeAcceptBooleanValue: function (name) {
        if (DOMProperty.isReservedProp(name)) {
            return true;
        }
        var propertyInfo = DOMProperty.getPropertyInfo(name);
        if (propertyInfo) {
            return propertyInfo.hasBooleanValue || propertyInfo.hasStringBooleanValue || propertyInfo.hasOverloadedBooleanValue;
        }
        var prefix = name.toLowerCase().slice(0, 5);
        return prefix === 'data-' || prefix === 'aria-';
    },


    /**
     * Checks to see if a property name is within the list of properties
     * reserved for internal Umd operations. These properties should
     * not be set on an HTML element.
     *
     * @private
     * @param {string} name
     * @return {boolean} If the name is within reserved props
     */
    isReservedProp: function (name) {
        return RESERVED_PROPS.hasOwnProperty(name);
    },


    injection: DOMPropertyInjection
};


/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdDOMComponentFlags
 */

var UmdDOMComponentFlags = {
    hasCachedChildNodes: 1 << 0
};

var UmdDOMComponentFlags_1 = UmdDOMComponentFlags;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdTypeOfWork
 * 
 */

var UmdTypeOfWork = {
    IndeterminateComponent: 0, // Before we know whether it is functional or class
    FunctionalComponent: 1,
    ClassComponent: 2,
    HostRoot: 3, // Root of a host tree. Could be nested inside another node.
    HostPortal: 4, // A subtree. Could be an entry point to a different renderer.
    HostComponent: 5,
    HostText: 6,
    CoroutineComponent: 7,
    CoroutineHandlerPhase: 8,
    YieldComponent: 9,
    Fragment: 10
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule HTMLNodeType
 */

/**
 * HTML nodeType values that represent the type of the node
 */

var HTMLNodeType = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_FRAGMENT_NODE: 11
};

var HTMLNodeType_1 = HTMLNodeType;

var HostComponent = UmdTypeOfWork.HostComponent;
var HostText = UmdTypeOfWork.HostText;

var ELEMENT_NODE$1 = HTMLNodeType_1.ELEMENT_NODE;
var COMMENT_NODE$1 = HTMLNodeType_1.COMMENT_NODE;



var ATTR_NAME = DOMProperty.ID_ATTRIBUTE_NAME;
var Flags = UmdDOMComponentFlags_1;

var randomKey = Math.random().toString(36).slice(2);

var internalInstanceKey = "__umdInternalInstance$" + randomKey;

var internalEventHandlersKey = "__umdEventHandlers$" + randomKey;

/**
 * Check if a given node should be cached.
 */
function shouldPrecacheNode(node, nodeID) {
    return node.nodeType === ELEMENT_NODE$1 && node.getAttribute(ATTR_NAME) === '' + nodeID || node.nodeType === COMMENT_NODE$1 && node.nodeValue === ' umd-text: ' + nodeID + ' ' || node.nodeType === COMMENT_NODE$1 && node.nodeValue === ' umd-empty: ' + nodeID + ' ';
}

/**
 * Drill down (through composites and empty components) until we get a host or
 * host text component.
 *
 * This is pretty polymorphic but unavoidable with the current structure we have
 * for `_renderedChildren`.
 */
function getRenderedHostOrTextFromComponent(component) {
    var rendered;
    while (rendered = component._renderedComponent) {
        component = rendered;
    }
    return component;
}

/**
 * Populate `_hostNode` on the rendered host/text component with the given
 * DOM node. The passed `inst` can be a composite.
 */
function precacheNode(inst, node) {
    var hostInst = getRenderedHostOrTextFromComponent(inst);
    hostInst._hostNode = node;
    node[internalInstanceKey] = hostInst;
}

function precacheFiberNode$1(hostInst, node) {
    node[internalInstanceKey] = hostInst;
}

function uncacheNode(inst) {
    var node = inst._hostNode;
    if (node) {
        delete node[internalInstanceKey];
        inst._hostNode = null;
    }
}

/**
 * Populate `_hostNode` on each child of `inst`, assuming that the children
 * match up with the DOM (element) children of `node`.
 *
 * We cache entire levels at once to avoid an n^2 problem where we access the
 * children of a node sequentially and have to walk from the start to our target
 * node every time.
 *
 * Since we update `_renderedChildren` and the actual DOM at (slightly)
 * different times, we could race here and see a newer `_renderedChildren` than
 * the DOM nodes we see. To avoid this, UmdMultiChild calls
 * `prepareToManageChildren` before we change `_renderedChildren`, at which
 * time the container's child nodes are always cached (until it unmounts).
 */
function precacheChildNodes(inst, node) {
    if (inst._flags & Flags.hasCachedChildNodes) {
        return;
    }
    var children = inst._renderedChildren;
    var childNode = node.firstChild;
    outer: for (var name in children) {
        if (!children.hasOwnProperty(name)) {
            continue;
        }
        var childInst = children[name];
        var childID = getRenderedHostOrTextFromComponent(childInst)._domID;
        if (childID === 0) {
            // We're currently unmounting this child in UmdMultiChild; skip it.
            continue;
        }
        // We assume the child nodes are in the same order as the child instances.
        for (; childNode !== null; childNode = childNode.nextSibling) {
            if (shouldPrecacheNode(childNode, childID)) {
                precacheNode(childInst, childNode);
                continue outer;
            }
        }
        // We reached the end of the DOM children without finding an ID match.
    }
    inst._flags |= Flags.hasCachedChildNodes;
}

/**
 * Given a DOM node, return the closest UmdDOMComponent or
 * UmdDOMTextComponent instance ancestor.
 */
function getClosestInstanceFromNode(node) {
    if (node[internalInstanceKey]) {
        return node[internalInstanceKey];
    }

    // Walk up the tree until we find an ancestor whose instance we have cached.
    var parents = [];
    while (!node[internalInstanceKey]) {
        parents.push(node);
        if (node.parentNode) {
            node = node.parentNode;
        } else {
            // Top of the tree. This node must not be part of a Umd tree (or is
            // unmounted, potentially).
            return null;
        }
    }

    var closest;
    var inst = node[internalInstanceKey];
    if (inst.tag === HostComponent || inst.tag === HostText) {
        // In Fiber, this will always be the deepest root.
        return inst;
    }
    for (; node && (inst = node[internalInstanceKey]); node = parents.pop()) {
        closest = inst;
        if (parents.length) {
            precacheChildNodes(inst, node);
        }
    }

    return closest;
}

/**
 * Given a DOM node, return the UmdDOMComponent or UmdDOMTextComponent
 * instance, or null if the node was not rendered by this Umd.
 */
function getInstanceFromNode(node) {
    var inst = node[internalInstanceKey];
    if (inst) {
        if (inst.tag === HostComponent || inst.tag === HostText) {
            return inst;
        } else if (inst._hostNode === node) {
            return inst;
        } else {
            return null;
        }
    }
    inst = getClosestInstanceFromNode(node);
    if (inst != null && inst._hostNode === node) {
        return inst;
    } else {
        return null;
    }
}

/**
 * Given a UmdDOMComponent or UmdDOMTextComponent, return the corresponding
 * DOM node.
 */
function getNodeFromInstance(inst) {
    if (inst.tag === HostComponent || inst.tag === HostText) {
        // In Fiber this, is just the state node right now. We assume it will be
        // a host component or host text.
        return inst.stateNode;
    }

    if (inst._hostNode) {
        return inst._hostNode;
    }

    // Walk up the tree until we find an ancestor whose DOM node we have cached.
    var parents = [];
    while (!inst._hostNode) {
        parents.push(inst);
        inst = inst._hostParent;
    }

    // Now parents contains each ancestor that does *not* have a cached native
    // node, and `inst` is the deepest ancestor that does.
    for (; parents.length; inst = parents.pop()) {
        precacheChildNodes(inst, inst._hostNode);
    }

    return inst._hostNode;
}

function getFiberCurrentPropsFromNode(node) {
    return node[internalEventHandlersKey] || null;
}

function updateFiberProps$1(node, props) {
    node[internalEventHandlersKey] = props;
}

var UmdDOMComponentTree = {
    getClosestInstanceFromNode: getClosestInstanceFromNode,
    getInstanceFromNode: getInstanceFromNode,
    getNodeFromInstance: getNodeFromInstance,
    precacheChildNodes: precacheChildNodes,
    precacheNode: precacheNode,
    uncacheNode: uncacheNode,
    precacheFiberNode: precacheFiberNode$1,
    getFiberCurrentPropsFromNode: getFiberCurrentPropsFromNode,
    updateFiberProps: updateFiberProps$1
};

var UmdDOMComponentTree_1 = UmdDOMComponentTree;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdInstanceMap
 */

/**
 * `UmdInstanceMap` maintains a mapping from a public facing stateful
 * instance (key) and the internal representation (value). This allows public
 * methods to accept the user facing instance as an argument and map them back
 * to internal methods.
 */

// TODO: Replace this with ES6: var UmdInstanceMap = new Map();

var UmdInstanceMap = {
    /**
     * This API should be called `delete` but we'd have to make sure to always
     * transform these to strings for IE support. When this transform is fully
     * supported we can rename it.
     */
    remove: function (key) {
        key._umdInternalFiber = undefined;
    },

    get: function (key) {
        return key._umdInternalFiber;
    },

    has: function (key) {
        return key._umdInternalFiber !== undefined;
    },

    set: function (key, value) {
        key._umdInternalFiber = value;
    }
};

var UmdInstanceMap_1 = UmdInstanceMap;

var UmdInternals = _element.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

var UmdGlobalSharedState = {
    UmdCurrentOwner: UmdInternals.UmdCurrentOwner
};

{
    _assign(UmdGlobalSharedState, {
        UmdComponentTreeHook: UmdInternals.UmdComponentTreeHook,
        UmdDebugCurrentFrame: UmdInternals.UmdDebugCurrentFrame
    });
}

var UmdGlobalSharedState_1 = UmdGlobalSharedState;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule getComponentName
 * 
 */

function getComponentName(instanceOrFiber) {
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

var getComponentName_1 = getComponentName;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdTypeOfSideEffect
 * 
 */

var UmdTypeOfSideEffect = {
    // Don't change these two values:
    NoEffect: 0, //           0b00000000
    PerformedWork: 1, //      0b00000001
    // You can change the rest (and add more).
    Placement: 2, //          0b00000010
    Update: 4, //             0b00000100
    PlacementAndUpdate: 6, // 0b00000110
    Deletion: 8, //           0b00001000
    ContentReset: 16, //      0b00010000
    Callback: 32, //          0b00100000
    Err: 64, //               0b01000000
    Ref: 128
};

var UmdCurrentOwner = UmdGlobalSharedState_1.UmdCurrentOwner;







var ClassComponent = UmdTypeOfWork.ClassComponent;
var HostComponent$1 = UmdTypeOfWork.HostComponent;
var HostRoot$1 = UmdTypeOfWork.HostRoot;
var HostPortal = UmdTypeOfWork.HostPortal;
var HostText$1 = UmdTypeOfWork.HostText;

var NoEffect = UmdTypeOfSideEffect.NoEffect;
var Placement = UmdTypeOfSideEffect.Placement;

var MOUNTING = 1;
var MOUNTED = 2;
var UNMOUNTED = 3;

function isFiberMountedImpl(fiber) {
    var node = fiber;
    if (!fiber.alternate) {
        // If there is no alternate, this might be a new tree that isn't inserted
        // yet. If it is, then it will have a pending insertion effect on it.
        if ((node.effectTag & Placement) !== NoEffect) {
            return MOUNTING;
        }
        while (node['return']) {
            node = node['return'];
            if ((node.effectTag & Placement) !== NoEffect) {
                return MOUNTING;
            }
        }
    } else {
        while (node['return']) {
            node = node['return'];
        }
    }
    if (node.tag === HostRoot$1) {
        // TODO: Check if this was a nested HostRoot when used with
        // renderContainerIntoSubtree.
        return MOUNTED;
    }
    // If we didn't hit the root, that means that we're in an disconnected tree
    // that has been unmounted.
    return UNMOUNTED;
}
var isFiberMounted = function (fiber) {
    return isFiberMountedImpl(fiber) === MOUNTED;
};

var isMounted = function (component) {
    {
        var owner = UmdCurrentOwner.current;
        if (owner !== null && owner.tag === ClassComponent) {
            var ownerFiber = owner;
            var instance = ownerFiber.stateNode;
            instance._warnedAboutRefsInRender = true;
        }
    }

    var fiber = UmdInstanceMap_1.get(component);
    if (!fiber) {
        return false;
    }
    return isFiberMountedImpl(fiber) === MOUNTED;
};


function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
        // If there is no alternate, then we only need to check if it is mounted.
        var state = isFiberMountedImpl(fiber);
        if (state === MOUNTING) {
            return null;
        }
        return fiber;
    }
    // If we have two possible branches, we'll walk backwards up to the root
    // to see what path the root points to. On the way we may hit one of the
    // special cases and we'll deal with them.
    var a = fiber;
    var b = alternate;
    while (true) {
        var parentA = a['return'];
        var parentB = parentA ? parentA.alternate : null;
        if (!parentA || !parentB) {
            // We're at the root.
            break;
        }

        // If both copies of the parent fiber point to the same child, we can
        // assume that the child is current. This happens when we bailout on low
        // priority: the bailed out fiber's child reuses the current child.
        if (parentA.child === parentB.child) {
            var child = parentA.child;
            while (child) {
                if (child === a) {
                    // We've determined that A is the current branch.

                    return fiber;
                }
                if (child === b) {
                    // We've determined that B is the current branch.

                    return alternate;
                }
                child = child.sibling;
            }

        }

        if (a['return'] !== b['return']) {
            // The return pointer of A and the return pointer of B point to different
            // fibers. We assume that return pointers never criss-cross, so A must
            // belong to the child set of A.return, and B must belong to the child
            // set of B.return.
            a = parentA;
            b = parentB;
        } else {
            // The return pointers point to the same fiber. We'll have to use the
            // default, slow path: scan the child sets of each parent alternate to see
            // which child belongs to which set.
            //
            // Search parent A's child set
            var didFindChild = false;
            var _child = parentA.child;
            while (_child) {
                if (_child === a) {
                    didFindChild = true;
                    a = parentA;
                    b = parentB;
                    break;
                }
                if (_child === b) {
                    didFindChild = true;
                    b = parentA;
                    a = parentB;
                    break;
                }
                _child = _child.sibling;
            }
            if (!didFindChild) {
                // Search parent B's child set
                _child = parentB.child;
                while (_child) {
                    if (_child === a) {
                        didFindChild = true;
                        a = parentB;
                        b = parentA;
                        break;
                    }
                    if (_child === b) {
                        didFindChild = true;
                        b = parentB;
                        a = parentA;
                        break;
                    }
                    _child = _child.sibling;
                }
            }
        }

    }
    // If the root is not a host container, we're in a disconnected tree. I.e.
    // unmounted.
    if (a.stateNode.current === a) {
        // We've determined that A is the current branch.
        return fiber;
    }
    // Otherwise B has to be current branch.
    return alternate;
}
var findCurrentFiberUsingSlowPath_1 = findCurrentFiberUsingSlowPath;

var findCurrentHostFiber = function (parent) {
    var currentParent = findCurrentFiberUsingSlowPath(parent);
    if (!currentParent) {
        return null;
    }

    // Next we'll drill down this component to find the first HostComponent/Text.
    var node = currentParent;
    while (true) {
        if (node.tag === HostComponent$1 || node.tag === HostText$1) {
            return node;
        } else if (node.child) {
            node.child['return'] = node;
            node = node.child;
            continue;
        }
        if (node === currentParent) {
            return null;
        }
        while (!node.sibling) {
            if (!node['return'] || node['return'] === currentParent) {
                return null;
            }
            node = node['return'];
        }
        node.sibling['return'] = node['return'];
        node = node.sibling;
    }
    // Flow needs the return null here, but ESLint complains about it.
    // eslint-disable-next-line no-unreachable
    return null;
};

var findCurrentHostFiberWithNoPortals = function (parent) {
    var currentParent = findCurrentFiberUsingSlowPath(parent);
    if (!currentParent) {
        return null;
    }

    // Next we'll drill down this component to find the first HostComponent/Text.
    var node = currentParent;
    while (true) {
        if (node.tag === HostComponent$1 || node.tag === HostText$1) {
            return node;
        } else if (node.child && node.tag !== HostPortal) {
            node.child['return'] = node;
            node = node.child;
            continue;
        }
        if (node === currentParent) {
            return null;
        }
        while (!node.sibling) {
            if (!node['return'] || node['return'] === currentParent) {
                return null;
            }
            node = node['return'];
        }
        node.sibling['return'] = node['return'];
        node = node.sibling;
    }
    // Flow needs the return null here, but ESLint complains about it.
    // eslint-disable-next-line no-unreachable
    return null;
};

var UmdFiberTreeReflection = {
    isFiberMounted: isFiberMounted,
    isMounted: isMounted,
    findCurrentFiberUsingSlowPath: findCurrentFiberUsingSlowPath_1,
    findCurrentHostFiber: findCurrentHostFiber,
    findCurrentHostFiberWithNoPortals: findCurrentHostFiberWithNoPortals
};

var UmdErrorUtils = {
    // Used by Fiber to simulate a try-catch.
    _caughtError: null,
    _hasCaughtError: false,

    // Used by event system to capture/rethrow the first error.
    _rethrowError: null,
    _hasRethrowError: false,

    injection: {
        injectErrorUtils: function (injectedErrorUtils) {
            invokeGuardedCallback = injectedErrorUtils.invokeGuardedCallback;
        }
    },

    /**
     * Call a function while guarding against errors that happens within it.
     * Returns an error if it throws, otherwise null.
     *
     * In production, this is implemented using a try-catch. The reason we don't
     * use a try-catch directly is so that we can swap out a different
     * implementation in DEV mode.
     *
     * @param {String} name of the guard to use for logging or debugging
     * @param {Function} func The function to invoke
     * @param {*} context The context to use when calling the function
     * @param {...*} args Arguments for function
     */
    invokeGuardedCallback: function (name, func, context, a, b, c, d, e, f) {
        invokeGuardedCallback.apply(UmdErrorUtils, arguments);
    },

    /**
     * Same as invokeGuardedCallback, but instead of returning an error, it stores
     * it in a global so it can be rethrown by `rethrowCaughtError` later.
     * TODO: See if _caughtError and _rethrowError can be unified.
     *
     * @param {String} name of the guard to use for logging or debugging
     * @param {Function} func The function to invoke
     * @param {*} context The context to use when calling the function
     * @param {...*} args Arguments for function
     */
    invokeGuardedCallbackAndCatchFirstError: function (name, func, context, a, b, c, d, e, f) {
        UmdErrorUtils.invokeGuardedCallback.apply(this, arguments);
        if (UmdErrorUtils.hasCaughtError()) {
            var error = UmdErrorUtils.clearCaughtError();
            if (!UmdErrorUtils._hasRethrowError) {
                UmdErrorUtils._hasRethrowError = true;
                UmdErrorUtils._rethrowError = error;
            }
        }
    },

    /**
     * During execution of guarded functions we will capture the first error which
     * we will rethrow to be handled by the top level error handler.
     */
    rethrowCaughtError: function () {
        return rethrowCaughtError.apply(UmdErrorUtils, arguments);
    },

    hasCaughtError: function () {
        return UmdErrorUtils._hasCaughtError;
    },

    clearCaughtError: function () {
        if (UmdErrorUtils._hasCaughtError) {
            var error = UmdErrorUtils._caughtError;
            UmdErrorUtils._caughtError = null;
            UmdErrorUtils._hasCaughtError = false;
            return error;
        }
    }
};

var invokeGuardedCallback = function (name, func, context, a, b, c, d, e, f) {
    UmdErrorUtils._hasCaughtError = false;
    UmdErrorUtils._caughtError = null;
    var funcArgs = Array.prototype.slice.call(arguments, 3);
    try {
        func.apply(context, funcArgs);
    } catch (error) {
        UmdErrorUtils._caughtError = error;
        UmdErrorUtils._hasCaughtError = true;
    }
};

{
    // In DEV mode, we swap out invokeGuardedCallback for a special version
    // that plays more nicely with the browser's DevTools. The idea is to preserve
    // "Pause on exceptions" behavior. Because Umd wraps all user-provided
    // functions in invokeGuardedCallback, and the production version of
    // invokeGuardedCallback uses a try-catch, all user exceptions are treated
    // like caught exceptions, and the DevTools won't pause unless the developer
    // takes the extra step of enabling pause on caught exceptions. This is
    // untintuitive, though, because even though Umd has caught the error, from
    // the developer's perspective, the error is uncaught.
    //
    // To preserve the expected "Pause on exceptions" behavior, we don't use a
    // try-catch in DEV. Instead, we synchronously dispatch a fake event to a fake
    // DOM node, and call the user-provided callback from inside an event handler
    // for that fake event. If the callback throws, the error is "captured" using
    // a global event handler. But because the error happens in a different
    // event loop context, it does not interrupt the normal program flow.
    // Effectively, this gives us try-catch behavior without actually using
    // try-catch. Neat!

    // Check that the browser supports the APIs we need to implement our special
    // DEV version of invokeGuardedCallback
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof document !== 'undefined' && typeof document.createEvent === 'function') {
        var fakeNode = document.createElement('umd');

        var invokeGuardedCallbackDev = function (name, func, context, a, b, c, d, e, f) {
            // Keeps track of whether the user-provided callback threw an error. We
            // set this to true at the beginning, then set it to false right after
            // calling the function. If the function errors, `didError` will never be
            // set to false. This strategy works even if the browser is flaky and
            // fails to call our global error handler, because it doesn't rely on
            // the error event at all.
            var didError = true;

            // Create an event handler for our fake event. We will synchronously
            // dispatch our fake event using `dispatchEvent`. Inside the handler, we
            // call the user-provided callback.
            var funcArgs = Array.prototype.slice.call(arguments, 3);
            function callCallback() {
                // We immediately remove the callback from event listeners so that
                // nested `invokeGuardedCallback` calls do not clash. Otherwise, a
                // nested call would trigger the fake event handlers of any call higher
                // in the stack.
                fakeNode.removeEventListener(evtType, callCallback, false);
                func.apply(context, funcArgs);
                didError = false;
            }

            // Create a global error event handler. We use this to capture the value
            // that was thrown. It's possible that this error handler will fire more
            // than once; for example, if non-Umd code also calls `dispatchEvent`
            // and a handler for that event throws. We should be resilient to most of
            // those cases. Even if our error event handler fires more than once, the
            // last error event is always used. If the callback actually does error,
            // we know that the last error event is the correct one, because it's not
            // possible for anything else to have happened in between our callback
            // erroring and the code that follows the `dispatchEvent` call below. If
            // the callback doesn't error, but the error event was fired, we know to
            // ignore it because `didError` will be false, as described above.
            var error = void 0;
            // Use this to track whether the error event is ever called.
            var didSetError = false;
            var isCrossOriginError = false;

            function onError(event) {
                error = event.error;
                didSetError = true;
                if (error === null && event.colno === 0 && event.lineno === 0) {
                    isCrossOriginError = true;
                }
            }

            // Create a fake event type.
            var evtType = 'umd-' + (name ? name : 'invokeguardedcallback');

            // Attach our event handlers
            window.addEventListener('error', onError);
            fakeNode.addEventListener(evtType, callCallback, false);

            // Synchronously dispatch our fake event. If the user-provided function
            // errors, it will trigger our global error handler.
            var evt = document.createEvent('Event');
            evt.initEvent(evtType, false, false);
            fakeNode.dispatchEvent(evt);

            if (didError) {
                if (!didSetError) {
                    // The callback errored, but the error event never fired.
                    error = new Error('An error was thrown inside one of your components, but Umd ' + "doesn't know what it was. This is likely due to browser " + 'flakiness. Umd does its best to preserve the "Pause on ' + 'exceptions" behavior of the DevTools, which requires some ' + "DEV-mode only tricks. It's possible that these don't work in " + 'your browser. Try triggering the error in production mode, ' + 'or switching to a modern browser. If you suspect that this is ' + 'actually an issue with Umd, please file an issue.');
                } else if (isCrossOriginError) {
                    error = new Error("A cross-origin error was thrown. Umd doesn't have access to " + 'the actual error object in development. ' + 'See https://fb.me/umd-crossorigin-error for more information.');
                }
                UmdErrorUtils._hasCaughtError = true;
                UmdErrorUtils._caughtError = error;
            } else {
                UmdErrorUtils._hasCaughtError = false;
                UmdErrorUtils._caughtError = null;
            }

            // Remove our event listeners
            window.removeEventListener('error', onError);
        };

        invokeGuardedCallback = invokeGuardedCallbackDev;
    }
}

var rethrowCaughtError = function () {
    if (UmdErrorUtils._hasRethrowError) {
        var error = UmdErrorUtils._rethrowError;
        UmdErrorUtils._rethrowError = null;
        UmdErrorUtils._hasRethrowError = false;
        throw error;
    }
};

var UmdErrorUtils_1 = UmdErrorUtils;



/**
 * Injected dependencies:
 */

/**
 * - `ComponentTree`: [required] Module that can convert between Umd instances
 *   and actual node references.
 */
var ComponentTree;
var injection = {
    injectComponentTree: function (Injected) {
        ComponentTree = Injected;
    }
};

function isEndish(topLevelType) {
    return topLevelType === 'topMouseUp' || topLevelType === 'topTouchEnd' || topLevelType === 'topTouchCancel';
}

function isMoveish(topLevelType) {
    return topLevelType === 'topMouseMove' || topLevelType === 'topTouchMove';
}
function isStartish(topLevelType) {
    return topLevelType === 'topMouseDown' || topLevelType === 'topTouchStart';
}

var validateEventDispatches;
{
    validateEventDispatches = function (event) {
        var dispatchListeners = event._dispatchListeners;
        var dispatchInstances = event._dispatchInstances;

        var listenersIsArr = Array.isArray(dispatchListeners);
        var listenersLen = listenersIsArr ? dispatchListeners.length : dispatchListeners ? 1 : 0;

        var instancesIsArr = Array.isArray(dispatchInstances);
        var instancesLen = instancesIsArr ? dispatchInstances.length : dispatchInstances ? 1 : 0;

    };
}

/**
 * Dispatch the event to the listener.
 * @param {SyntheticEvent} event SyntheticEvent to handle
 * @param {boolean} simulated If the event is simulated (changes exn behavior)
 * @param {function} listener Application-level callback
 * @param {*} inst Internal component instance
 */
function executeDispatch(event, simulated, listener, inst) {
    var type = event.type || 'unknown-event';
    event.currentTarget = EventPluginUtils.getNodeFromInstance(inst);
    UmdErrorUtils_1.invokeGuardedCallbackAndCatchFirstError(type, listener, undefined, event);
    event.currentTarget = null;
}

/**
 * Standard/simple iteration through an event's collected dispatches.
 */
function executeDispatchesInOrder(event, simulated) {
    var dispatchListeners = event._dispatchListeners;
    var dispatchInstances = event._dispatchInstances;
    {
        validateEventDispatches(event);
    }
    if (Array.isArray(dispatchListeners)) {
        for (var i = 0; i < dispatchListeners.length; i++) {
            if (event.isPropagationStopped()) {
                break;
            }
            // Listeners and Instances are two parallel arrays that are always in sync.
            executeDispatch(event, simulated, dispatchListeners[i], dispatchInstances[i]);
        }
    } else if (dispatchListeners) {
        executeDispatch(event, simulated, dispatchListeners, dispatchInstances);
    }
    event._dispatchListeners = null;
    event._dispatchInstances = null;
}

/**
 * Standard/simple iteration through an event's collected dispatches, but stops
 * at the first dispatch execution returning true, and returns that id.
 *
 * @return {?string} id of the first dispatch execution who's listener returns
 * true, or null if no listener returned true.
 */
function executeDispatchesInOrderStopAtTrueImpl(event) {
    var dispatchListeners = event._dispatchListeners;
    var dispatchInstances = event._dispatchInstances;
    {
        validateEventDispatches(event);
    }
    if (Array.isArray(dispatchListeners)) {
        for (var i = 0; i < dispatchListeners.length; i++) {
            if (event.isPropagationStopped()) {
                break;
            }
            // Listeners and Instances are two parallel arrays that are always in sync.
            if (dispatchListeners[i](event, dispatchInstances[i])) {
                return dispatchInstances[i];
            }
        }
    } else if (dispatchListeners) {
        if (dispatchListeners(event, dispatchInstances)) {
            return dispatchInstances;
        }
    }
    return null;
}

/**
 * @see executeDispatchesInOrderStopAtTrueImpl
 */
function executeDispatchesInOrderStopAtTrue(event) {
    var ret = executeDispatchesInOrderStopAtTrueImpl(event);
    event._dispatchInstances = null;
    event._dispatchListeners = null;
    return ret;
}

/**
 * Execution of a "direct" dispatch - there must be at most one dispatch
 * accumulated on the event or it is considered an error. It doesn't really make
 * sense for an event with multiple dispatches (bubbled) to keep track of the
 * return values at each dispatch execution, but it does tend to make sense when
 * dealing with "direct" dispatches.
 *
 * @return {*} The return value of executing the single dispatch.
 */
function executeDirectDispatch(event) {
    {
        validateEventDispatches(event);
    }
    var dispatchListener = event._dispatchListeners;
    var dispatchInstance = event._dispatchInstances;
    event.currentTarget = dispatchListener ? EventPluginUtils.getNodeFromInstance(dispatchInstance) : null;
    var res = dispatchListener ? dispatchListener(event) : null;
    event.currentTarget = null;
    event._dispatchListeners = null;
    event._dispatchInstances = null;
    return res;
}

/**
 * @param {SyntheticEvent} event
 * @return {boolean} True iff number of dispatches accumulated is greater than 0.
 */
function hasDispatches(event) {
    return !!event._dispatchListeners;
}

/**
 * General utilities that are useful in creating custom Event Plugins.
 */
var EventPluginUtils = {
    isEndish: isEndish,
    isMoveish: isMoveish,
    isStartish: isStartish,

    executeDirectDispatch: executeDirectDispatch,
    executeDispatchesInOrder: executeDispatchesInOrder,
    executeDispatchesInOrderStopAtTrue: executeDispatchesInOrderStopAtTrue,
    hasDispatches: hasDispatches,

    getFiberCurrentPropsFromNode: function (node) {
        return ComponentTree.getFiberCurrentPropsFromNode(node);
    },
    getInstanceFromNode: function (node) {
        return ComponentTree.getInstanceFromNode(node);
    },
    getNodeFromInstance: function (node) {
        return ComponentTree.getNodeFromInstance(node);
    },

    injection: injection
};

var EventPluginUtils_1 = EventPluginUtils;

// Use to restore controlled state after a change event has fired.

var fiberHostComponent = null;

var UmdControlledComponentInjection = {
    injectFiberControlledHostComponent: function (hostComponentImpl) {
        // The fiber implementation doesn't use dynamic dispatch so we need to
        // inject the implementation.
        fiberHostComponent = hostComponentImpl;
    }
};

var restoreTarget = null;
var restoreQueue = null;

function restoreStateOfTarget(target) {
    // We perform this translation at the end of the event loop so that we
    // always receive the correct fiber here
    var internalInstance = EventPluginUtils_1.getInstanceFromNode(target);
    if (!internalInstance) {
        // Unmounted
        return;
    }
    if (typeof internalInstance.tag === 'number') {
        var props = EventPluginUtils_1.getFiberCurrentPropsFromNode(internalInstance.stateNode);
        fiberHostComponent.restoreControlledState(internalInstance.stateNode, internalInstance.type, props);
        return;
    }
    // If it is not a Fiber, we can just use dynamic dispatch.
    internalInstance.restoreControlledState();
}

var UmdControlledComponent = {
    injection: UmdControlledComponentInjection,

    enqueueStateRestore: function (target) {
        if (restoreTarget) {
            if (restoreQueue) {
                restoreQueue.push(target);
            } else {
                restoreQueue = [target];
            }
        } else {
            restoreTarget = target;
        }
    },
    restoreStateIfNeeded: function () {
        if (!restoreTarget) {
            return;
        }
        var target = restoreTarget;
        var queuedTargets = restoreQueue;
        restoreTarget = null;
        restoreQueue = null;

        restoreStateOfTarget(target);
        if (queuedTargets) {
            for (var i = 0; i < queuedTargets.length; i++) {
                restoreStateOfTarget(queuedTargets[i]);
            }
        }
    }
};

var UmdControlledComponent_1 = UmdControlledComponent;

// Used as a way to call batchedUpdates when we don't know if we're in a Fiber
// or Stack context. Such as when we're dispatching events or if third party
// libraries need to call batchedUpdates. Eventually, this API will go away when
// everything is batched by default. We'll then have a similar API to opt-out of
// scheduled work and instead do synchronous work.

// Defaults
var stackBatchedUpdates = function (fn, a, b, c, d, e) {
    return fn(a, b, c, d, e);
};
var fiberBatchedUpdates = function (fn, bookkeeping) {
    return fn(bookkeeping);
};

function performFiberBatchedUpdates(fn, bookkeeping) {
    // If we have Fiber loaded, we need to wrap this in a batching call so that
    // Fiber can apply its default priority for this call.
    return fiberBatchedUpdates(fn, bookkeeping);
}
function batchedUpdates(fn, bookkeeping) {
    // We first perform work with the stack batching strategy, by passing our
    // indirection to it.
    return stackBatchedUpdates(performFiberBatchedUpdates, fn, bookkeeping);
}

var isNestingBatched = false;
function batchedUpdatesWithControlledComponents(fn, bookkeeping) {
    if (isNestingBatched) {
        // If we are currently inside another batch, we need to wait until it
        // fully completes before restoring state. Therefore, we add the target to
        // a queue of work.
        return batchedUpdates(fn, bookkeeping);
    }
    isNestingBatched = true;
    try {
        return batchedUpdates(fn, bookkeeping);
    } finally {
        // Here we wait until all updates have propagated, which is important
        // when using controlled components within layers:
        // https://github.com/facebook/umd/issues/1698
        // Then we restore state of any controlled component.
        isNestingBatched = false;
        UmdControlledComponent_1.restoreStateIfNeeded();
    }
}

var UmdGenericBatchingInjection = {
    injectStackBatchedUpdates: function (_batchedUpdates) {
        stackBatchedUpdates = _batchedUpdates;
    },
    injectFiberBatchedUpdates: function (_batchedUpdates) {
        fiberBatchedUpdates = _batchedUpdates;
    }
};

var UmdGenericBatching = {
    batchedUpdates: batchedUpdatesWithControlledComponents,
    injection: UmdGenericBatchingInjection
};

var UmdGenericBatching_1 = UmdGenericBatching;

var TEXT_NODE$1 = HTMLNodeType_1.TEXT_NODE;

/**
 * Gets the target node from a native browser event by accounting for
 * inconsistencies in browser DOM APIs.
 *
 * @param {object} nativeEvent Native browser event.
 * @return {DOMEventTarget} Target node.
 */


function getEventTarget(nativeEvent) {
    var target = nativeEvent.target || nativeEvent.srcElement || window;

    // Normalize SVG <use> element events #4963
    if (target.correspondingUseElement) {
        target = target.correspondingUseElement;
    }

    // Safari may fire events on text nodes (Node.TEXT_NODE is 3).
    // @see http://www.quirksmode.org/js/events_properties.html
    return target.nodeType === TEXT_NODE$1 ? target.parentNode : target;
}

var getEventTarget_1 = getEventTarget;

var HostRoot = UmdTypeOfWork.HostRoot;


var CALLBACK_BOOKKEEPING_POOL_SIZE = 10;
var callbackBookkeepingPool = [];

/**
 * Find the deepest Umd component completely containing the root of the
 * passed-in instance (for use when entire Umd trees are nested within each
 * other). If Umd trees are not nested, returns null.
 */
function findRootContainerNode(inst) {
    // TODO: It may be a good idea to cache this to prevent unnecessary DOM
    // traversal, but caching is difficult to do correctly without using a
    // mutation observer to listen for all DOM changes.
    if (typeof inst.tag === 'number') {
        while (inst['return']) {
            inst = inst['return'];
        }
        if (inst.tag !== HostRoot) {
            // This can happen if we're in a detached tree.
            return null;
        }
        return inst.stateNode.containerInfo;
    } else {
        while (inst._hostParent) {
            inst = inst._hostParent;
        }
        var rootNode = UmdDOMComponentTree_1.getNodeFromInstance(inst);
        return rootNode.parentNode;
    }
}

// Used to store ancestor hierarchy in top level callback
function getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst) {
    if (callbackBookkeepingPool.length) {
        var instance = callbackBookkeepingPool.pop();
        instance.topLevelType = topLevelType;
        instance.nativeEvent = nativeEvent;
        instance.targetInst = targetInst;
        return instance;
    }
    return {
        topLevelType: topLevelType,
        nativeEvent: nativeEvent,
        targetInst: targetInst,
        ancestors: []
    };
}

function releaseTopLevelCallbackBookKeeping(instance) {
    instance.topLevelType = null;
    instance.nativeEvent = null;
    instance.targetInst = null;
    instance.ancestors.length = 0;
    if (callbackBookkeepingPool.length < CALLBACK_BOOKKEEPING_POOL_SIZE) {
        callbackBookkeepingPool.push(instance);
    }
}

function handleTopLevelImpl(bookKeeping) {
    var targetInst = bookKeeping.targetInst;

    // Loop through the hierarchy, in case there's any nested components.
    // It's important that we build the array of ancestors before calling any
    // event handlers, because event handlers can modify the DOM, leading to
    // inconsistencies with UmdMount's node cache. See #1105.
    var ancestor = targetInst;
    do {
        if (!ancestor) {
            bookKeeping.ancestors.push(ancestor);
            break;
        }
        var root = findRootContainerNode(ancestor);
        if (!root) {
            break;
        }
        bookKeeping.ancestors.push(ancestor);
        ancestor = UmdDOMComponentTree_1.getClosestInstanceFromNode(root);
    } while (ancestor);

    for (var i = 0; i < bookKeeping.ancestors.length; i++) {
        targetInst = bookKeeping.ancestors[i];
        $DOMEventListener._handleTopLevel(bookKeeping.topLevelType, targetInst, bookKeeping.nativeEvent, getEventTarget_1(bookKeeping.nativeEvent));
    }
}

const $DOMEventListener = {
    _enabled: true,
    _handleTopLevel: null,

    setHandleTopLevel: function (handleTopLevel) {
        $DOMEventListener._handleTopLevel = handleTopLevel;
    },

    setEnabled: function (enabled) {
        $DOMEventListener._enabled = !!enabled;
    },

    isEnabled: function () {
        return $DOMEventListener._enabled;
    },

    /**
     * Traps top-level events by using event bubbling.
     *
     * @param {string} topLevelType Record from `BrowserEventConstants`.
     * @param {string} handlerBaseName Event name (e.g. "click").
     * @param {object} element Element on which to attach listener.
     * @return {?object} An object with a remove function which will forcefully
     *                  remove the listener.
     * @internal
     */
    trapBubbledEvent: function (topLevelType, handlerBaseName, element) {
        if (!element) {
            return null;
        }
        return EventListener.listen(element, handlerBaseName, $DOMEventListener.dispatchEvent.bind(null, topLevelType));
    },

    /**
     * Traps a top-level event by using event capturing.
     *
     * @param {string} topLevelType Record from `BrowserEventConstants`.
     * @param {string} handlerBaseName Event name (e.g. "click").
     * @param {object} element Element on which to attach listener.
     * @return {?object} An object with a remove function which will forcefully
     *                  remove the listener.
     * @internal
     */
    trapCapturedEvent: function (topLevelType, handlerBaseName, element) {
        if (!element) {
            return null;
        }
        return EventListener.capture(element, handlerBaseName, $DOMEventListener.dispatchEvent.bind(null, topLevelType));
    },

    dispatchEvent: function (topLevelType, nativeEvent) {
        if (!$DOMEventListener._enabled) {
            return;
        }

        var nativeEventTarget = getEventTarget_1(nativeEvent);
        var targetInst = UmdDOMComponentTree_1.getClosestInstanceFromNode(nativeEventTarget);
        if (targetInst !== null && typeof targetInst.tag === 'number' && !UmdFiberTreeReflection.isFiberMounted(targetInst)) {
            // If we get an event (ex: img onload) before committing that
            // component's mount, ignore it for now (that is, treat it as if it was an
            // event on a non-Umd tree). We might also consider queueing events and
            // dispatching them after the mount.
            targetInst = null;
        }

        var bookKeeping = getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst);

        try {
            // Event queue being processed in the same cycle allows
            // `preventDefault`.
            UmdGenericBatching_1.batchedUpdates(handleTopLevelImpl, bookKeeping);
        } finally {
            releaseTopLevelCallbackBookKeeping(bookKeeping);
        }
    }
};


/**
 * Accumulates items that must not be null or undefined into the first one. This
 * is used to conserve memory by avoiding array allocations, and thus sacrifices
 * API cleanness. Since `current` can be null before being passed in and not
 * null after this function, make sure to assign it back to `current`:
 *
 * `a = accumulateInto(a, b);`
 *
 * This API should be sparingly used. Try `accumulate` for something cleaner.
 *
 * @return {*|array<*>} An accumulation of items.
 */

function accumulateInto(current, next) {

    if (current == null) {
        return next;
    }

    // Both are not empty. Warning: Never call x.concat(y) when you are not
    // certain that x is an Array (x could be a string with concat method).
    if (Array.isArray(current)) {
        if (Array.isArray(next)) {
            current.push.apply(current, next);
            return current;
        }
        current.push(next);
        return current;
    }

    if (Array.isArray(next)) {
        // A bit too dangerous to mutate `next`.
        return [current].concat(next);
    }

    return [current, next];
}

var accumulateInto_1 = accumulateInto;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule forEachAccumulated
 * 
 */

/**
 * @param {array} arr an "accumulation" of items which is either an Array or
 * a single item. Useful when paired with the `accumulate` module. This is a
 * simple utility that allows us to reason about a collection of items, but
 * handling the case when there is exactly one item (and we do not need to
 * allocate an array).
 * @param {function} cb Callback invoked with each element or a collection.
 * @param {?} [scope] Scope used as `this` in a callback.
 */

function forEachAccumulated(arr, cb, scope) {
    if (Array.isArray(arr)) {
        arr.forEach(cb, scope);
    } else if (arr) {
        cb.call(scope, arr);
    }
}

var forEachAccumulated_1 = forEachAccumulated;

/**
 * Internal queue of events that have accumulated their dispatches and are
 * waiting to have their dispatches executed.
 */
var eventQueue = null;

/**
 * Dispatches an event and releases it back into the pool, unless persistent.
 *
 * @param {?object} event Synthetic event to be dispatched.
 * @param {boolean} simulated If the event is simulated (changes exn behavior)
 * @private
 */
var executeDispatchesAndRelease = function (event, simulated) {
    if (event) {
        EventPluginUtils_1.executeDispatchesInOrder(event, simulated);

        if (!event.isPersistent()) {
            event.constructor.release(event);
        }
    }
};
var executeDispatchesAndReleaseSimulated = function (e) {
    return executeDispatchesAndRelease(e, true);
};
var executeDispatchesAndReleaseTopLevel = function (e) {
    return executeDispatchesAndRelease(e, false);
};

function isInteractive(tag) {
    return tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea';
}

function shouldPreventMouseEvent(name, type, props) {
    switch (name) {
        case 'onClick':
        case 'onClickCapture':
        case 'onDoubleClick':
        case 'onDoubleClickCapture':
        case 'onMouseDown':
        case 'onMouseDownCapture':
        case 'onMouseMove':
        case 'onMouseMoveCapture':
        case 'onMouseUp':
        case 'onMouseUpCapture':
            return !!(props.disabled && isInteractive(type));
        default:
            return false;
    }
}

/**
 * This is a unified interface for event plugins to be installed and configured.
 *
 * Event plugins can implement the following properties:
 *
 *   `extractEvents` {function(string, DOMEventTarget, string, object): *}
 *     Required. When a top-level event is fired, this method is expected to
 *     extract synthetic events that will in turn be queued and dispatched.
 *
 *   `eventTypes` {object}
 *     Optional, plugins that fire events must publish a mapping of registration
 *     names that are used to register listeners. Values of this mapping must
 *     be objects that contain `registrationName` or `phasedRegistrationNames`.
 *
 *   `executeDispatch` {function(object, function, string)}
 *     Optional, allows plugins to override how an event gets dispatched. By
 *     default, the listener is simply invoked.
 *
 * Each plugin that is injected into `EventsPluginHub` is immediately operable.
 *
 * @public
 */
var EventPluginHub = {
    /**
     * Methods for injecting dependencies.
     */
    injection: {
        /**
         * @param {array} InjectedEventPluginOrder
         * @public
         */
        injectEventPluginOrder: EventPluginRegistry_1.injectEventPluginOrder,

        /**
         * @param {object} injectedNamesToPlugins Map from names to plugin modules.
         */
        injectEventPluginsByName: EventPluginRegistry_1.injectEventPluginsByName
    },

    /**
     * @param {object} inst The instance, which is the source of events.
     * @param {string} registrationName Name of listener (e.g. `onClick`).
     * @return {?function} The stored callback.
     */
    getListener: function (inst, registrationName) {
        var listener;

        // TODO: shouldPreventMouseEvent is DOM-specific and definitely should not
        // live here; needs to be moved to a better place soon
        if (typeof inst.tag === 'number') {
            var stateNode = inst.stateNode;
            if (!stateNode) {
                // Work in progress (ex: onload events in incremental mode).
                return null;
            }
            var props = EventPluginUtils_1.getFiberCurrentPropsFromNode(stateNode);
            if (!props) {
                // Work in progress.
                return null;
            }
            listener = props[registrationName];
            if (shouldPreventMouseEvent(registrationName, inst.type, props)) {
                return null;
            }
        } else {
            var currentElement = inst._currentElement;
            if (typeof currentElement === 'string' || typeof currentElement === 'number') {
                // Text node, let it bubble through.
                return null;
            }
            if (!inst._rootNodeID) {
                // If the instance is already unmounted, we have no listeners.
                return null;
            }
            var _props = currentElement.props;
            listener = _props[registrationName];
            if (shouldPreventMouseEvent(registrationName, currentElement.type, _props)) {
                return null;
            }
        }

        return listener;
    },

    /**
     * Allows registered plugins an opportunity to extract events from top-level
     * native browser events.
     *
     * @return {*} An accumulation of synthetic events.
     * @internal
     */
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        var events;
        var plugins = EventPluginRegistry_1.plugins;
        for (var i = 0; i < plugins.length; i++) {
            // Not every plugin in the ordering may be loaded at runtime.
            var possiblePlugin = plugins[i];
            if (possiblePlugin) {
                var extractedEvents = possiblePlugin.extractEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget);
                if (extractedEvents) {
                    events = accumulateInto_1(events, extractedEvents);
                }
            }
        }
        return events;
    },

    /**
     * Enqueues a synthetic event that should be dispatched when
     * `processEventQueue` is invoked.
     *
     * @param {*} events An accumulation of synthetic events.
     * @internal
     */
    enqueueEvents: function (events) {
        if (events) {
            eventQueue = accumulateInto_1(eventQueue, events);
        }
    },

    /**
     * Dispatches all synthetic events on the event queue.
     *
     * @internal
     */
    processEventQueue: function (simulated) {
        // Set `eventQueue` to null before processing it so that we can tell if more
        // events get enqueued while processing.
        var processingEventQueue = eventQueue;
        eventQueue = null;
        if (simulated) {
            forEachAccumulated_1(processingEventQueue, executeDispatchesAndReleaseSimulated);
        } else {
            forEachAccumulated_1(processingEventQueue, executeDispatchesAndReleaseTopLevel);
        }
        // This would be a good time to rethrow if any of the event handlers threw.
        UmdErrorUtils_1.rethrowCaughtError();
    }
};

var EventPluginHub_1 = EventPluginHub;

function runEventQueueInBatch(events) {
    EventPluginHub_1.enqueueEvents(events);
    EventPluginHub_1.processEventQueue(false);
}

var UmdEventEmitterMixin = {
    /**
     * Streams a fired top-level event to `EventPluginHub` where plugins have the
     * opportunity to create `UmdEvent`s to be dispatched.
     */
    handleTopLevel: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        var events = EventPluginHub_1.extractEvents(topLevelType, targetInst, nativeEvent, nativeEventTarget);
        runEventQueueInBatch(events);
    }
};

var UmdEventEmitterMixin_1 = UmdEventEmitterMixin;

var useHasFeature;


/**
 * Checks if an event is supported in the current execution environment.
 *
 * NOTE: This will not work correctly for non-generic events such as `change`,
 * `reset`, `load`, `error`, and `select`.
 *
 * Borrows from Modernizr.
 *
 * @param {string} eventNameSuffix Event name, e.g. "click".
 * @param {?boolean} capture Check if the capture phase is supported.
 * @return {boolean} True if the event is supported.
 * @internal
 * @license Modernizr 3.0.0pre (Custom Build) | MIT
 */
function isEventSupported(eventNameSuffix, capture) {
    if (!ExecutionEnvironment.canUseDOM || capture && !('addEventListener' in document)) {
        return false;
    }

    var eventName = 'on' + eventNameSuffix;
    var isSupported = eventName in document;

    if (!isSupported) {
        var element = document.createElement('div');
        element.setAttribute(eventName, 'return;');
        isSupported = typeof element[eventName] === 'function';
    }

    if (!isSupported && useHasFeature && eventNameSuffix === 'wheel') {
        // This is the only way to test support for the `wheel` event in IE9+.
        isSupported = document.implementation.hasFeature('Events.wheel', '3.0');
    }

    return isSupported;
}

var isEventSupported_1 = isEventSupported;

/**
 * Generate a mapping of standard vendor prefixes using the defined style property and event name.
 *
 * @param {string} styleProp
 * @param {string} eventName
 * @returns {object}
 */
function makePrefixMap(styleProp, eventName) {
    var prefixes = {};

    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes['Webkit' + styleProp] = 'webkit' + eventName;
    prefixes['Moz' + styleProp] = 'moz' + eventName;
    prefixes['ms' + styleProp] = 'MS' + eventName;
    prefixes['O' + styleProp] = 'o' + eventName.toLowerCase();

    return prefixes;
}

/**
 * A list of event names to a configurable list of vendor prefixes.
 */
var vendorPrefixes = {
    animationend: makePrefixMap('Animation', 'AnimationEnd'),
    animationiteration: makePrefixMap('Animation', 'AnimationIteration'),
    animationstart: makePrefixMap('Animation', 'AnimationStart'),
    transitionend: makePrefixMap('Transition', 'TransitionEnd')
};

/**
 * Event names that have already been detected and prefixed (if applicable).
 */
var prefixedEventNames = {};

/**
 * Element to check for prefixes on.
 */
var style = {};

/**
 * Bootstrap if a DOM exists.
 */
if (ExecutionEnvironment.canUseDOM) {
    style = document.createElement('div').style;

    // On some platforms, in particular some releases of Android 4.x,
    // the un-prefixed "animation" and "transition" properties are defined on the
    // style object but the events that fire will still be prefixed, so we need
    // to check if the un-prefixed events are usable, and if not remove them from the map.
    if (!('AnimationEvent' in window)) {
        delete vendorPrefixes.animationend.animation;
        delete vendorPrefixes.animationiteration.animation;
        delete vendorPrefixes.animationstart.animation;
    }

    // Same as above
    if (!('TransitionEvent' in window)) {
        delete vendorPrefixes.transitionend.transition;
    }
}

/**
 * Attempts to determine the correct vendor prefixed event name.
 *
 * @param {string} eventName
 * @returns {string}
 */
function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) {
        return prefixedEventNames[eventName];
    } else if (!vendorPrefixes[eventName]) {
        return eventName;
    }

    var prefixMap = vendorPrefixes[eventName];

    for (var styleProp in prefixMap) {
        if (prefixMap.hasOwnProperty(styleProp) && styleProp in style) {
            return prefixedEventNames[eventName] = prefixMap[styleProp];
        }
    }

    return '';
}

var getVendorPrefixedEventName_1 = getVendorPrefixedEventName;

/**
 * Types of raw signals from the browser caught at the top level.
 *
 * For events like 'submit' which don't consistently bubble (which we
 * trap at a lower node than `document`), binding at `document` would
 * cause duplicate events so we don't include them here.
 */
var topLevelTypes$1 = {
    topAbort: 'abort',
    topAnimationEnd: getVendorPrefixedEventName_1('animationend') || 'animationend',
    topAnimationIteration: getVendorPrefixedEventName_1('animationiteration') || 'animationiteration',
    topAnimationStart: getVendorPrefixedEventName_1('animationstart') || 'animationstart',
    topBlur: 'blur',
    topCancel: 'cancel',
    topCanPlay: 'canplay',
    topCanPlayThrough: 'canplaythrough',
    topChange: 'change',
    topClick: 'click',
    topClose: 'close',
    topCompositionEnd: 'compositionend',
    topCompositionStart: 'compositionstart',
    topCompositionUpdate: 'compositionupdate',
    topContextMenu: 'contextmenu',
    topCopy: 'copy',
    topCut: 'cut',
    topDoubleClick: 'dblclick',
    topDrag: 'drag',
    topDragEnd: 'dragend',
    topDragEnter: 'dragenter',
    topDragExit: 'dragexit',
    topDragLeave: 'dragleave',
    topDragOver: 'dragover',
    topDragStart: 'dragstart',
    topDrop: 'drop',
    topDurationChange: 'durationchange',
    topEmptied: 'emptied',
    topEncrypted: 'encrypted',
    topEnded: 'ended',
    topError: 'error',
    topFocus: 'focus',
    topInput: 'input',
    topKeyDown: 'keydown',
    topKeyPress: 'keypress',
    topKeyUp: 'keyup',
    topLoadedData: 'loadeddata',
    topLoad: 'load',
    topLoadedMetadata: 'loadedmetadata',
    topLoadStart: 'loadstart',
    topMouseDown: 'mousedown',
    topMouseMove: 'mousemove',
    topMouseOut: 'mouseout',
    topMouseOver: 'mouseover',
    topMouseUp: 'mouseup',
    topPaste: 'paste',
    topPause: 'pause',
    topPlay: 'play',
    topPlaying: 'playing',
    topProgress: 'progress',
    topRateChange: 'ratechange',
    topScroll: 'scroll',
    topSeeked: 'seeked',
    topSeeking: 'seeking',
    topSelectionChange: 'selectionchange',
    topStalled: 'stalled',
    topSuspend: 'suspend',
    topTextInput: 'textInput',
    topTimeUpdate: 'timeupdate',
    topToggle: 'toggle',
    topTouchCancel: 'touchcancel',
    topTouchEnd: 'touchend',
    topTouchMove: 'touchmove',
    topTouchStart: 'touchstart',
    topTransitionEnd: getVendorPrefixedEventName_1('transitionend') || 'transitionend',
    topVolumeChange: 'volumechange',
    topWaiting: 'waiting',
    topWheel: 'wheel'
};

var BrowserEventConstants = {
    topLevelTypes: topLevelTypes$1
};

var BrowserEventConstants_1 = BrowserEventConstants;

var topLevelTypes = BrowserEventConstants_1.topLevelTypes;

var alreadyListeningTo = {};
var umdTopListenersCounter = 0;

/**
 * To ensure no conflicts with other potential Umd instances on the page
 */
var topListenersIDKey = '_umdListenersID' + ('' + Math.random()).slice(2);

function getListeningForDocument(mountAt) {
    // In IE8, `mountAt` is a host object and doesn't have `hasOwnProperty`
    // directly.
    if (!Object.prototype.hasOwnProperty.call(mountAt, topListenersIDKey)) {
        mountAt[topListenersIDKey] = umdTopListenersCounter++;
        alreadyListeningTo[mountAt[topListenersIDKey]] = {};
    }
    return alreadyListeningTo[mountAt[topListenersIDKey]];
}

var UmdBrowserEventEmitter = _assign({}, UmdEventEmitterMixin_1, {
    /**
     * Sets whether or not any created callbacks should be enabled.
     *
     * @param {boolean} enabled True if callbacks should be enabled.
     */
    setEnabled: function (enabled) {
        if ($DOMEventListener) {
            $DOMEventListener.setEnabled(enabled);
        }
    },

    /**
     * @return {boolean} True if callbacks are enabled.
     */
    isEnabled: function () {
        return !!($DOMEventListener && $DOMEventListener.isEnabled());
    },

    /**
     * We listen for bubbled touch events on the document object.
     *
     * Firefox v8.01 (and possibly others) exhibited strange behavior when
     * mounting `onmousemove` events at some node that was not the document
     * element. The symptoms were that if your mouse is not moving over something
     * contained within that mount point (for example on the background) the
     * top-level listeners for `onmousemove` won't be called. However, if you
     * register the `mousemove` on the document object, then it will of course
     * catch all `mousemove`s. This along with iOS quirks, justifies restricting
     * top-level listeners to the document object only, at least for these
     * movement types of events and possibly all events.
     *
     * @see http://www.quirksmode.org/blog/archives/2010/09/click_event_del.html
     *
     * Also, `keyup`/`keypress`/`keydown` do not bubble to the window on IE, but
     * they bubble to document.
     *
     * @param {string} registrationName Name of listener (e.g. `onClick`).
     * @param {object} contentDocumentHandle Document which owns the container
     */
    listenTo: function (registrationName, contentDocumentHandle) {
        var mountAt = contentDocumentHandle;
        var isListening = getListeningForDocument(mountAt);
        var dependencies = EventPluginRegistry_1.registrationNameDependencies[registrationName];

        for (var i = 0; i < dependencies.length; i++) {
            var dependency = dependencies[i];
            if (!(isListening.hasOwnProperty(dependency) && isListening[dependency])) {
                if (dependency === 'topWheel') {
                    if (isEventSupported_1('wheel')) {
                        $DOMEventListener.trapBubbledEvent('topWheel', 'wheel', mountAt);
                    } else if (isEventSupported_1('mousewheel')) {
                        $DOMEventListener.trapBubbledEvent('topWheel', 'mousewheel', mountAt);
                    } else {
                        // Firefox needs to capture a different mouse scroll event.
                        // @see http://www.quirksmode.org/dom/events/tests/scroll.html
                        $DOMEventListener.trapBubbledEvent('topWheel', 'DOMMouseScroll', mountAt);
                    }
                } else if (dependency === 'topScroll') {
                    $DOMEventListener.trapCapturedEvent('topScroll', 'scroll', mountAt);
                } else if (dependency === 'topFocus' || dependency === 'topBlur') {
                    $DOMEventListener.trapCapturedEvent('topFocus', 'focus', mountAt);
                    $DOMEventListener.trapCapturedEvent('topBlur', 'blur', mountAt);

                    // to make sure blur and focus event listeners are only attached once
                    isListening.topBlur = true;
                    isListening.topFocus = true;
                } else if (dependency === 'topCancel') {
                    if (isEventSupported_1('cancel', true)) {
                        $DOMEventListener.trapCapturedEvent('topCancel', 'cancel', mountAt);
                    }
                    isListening.topCancel = true;
                } else if (dependency === 'topClose') {
                    if (isEventSupported_1('close', true)) {
                        $DOMEventListener.trapCapturedEvent('topClose', 'close', mountAt);
                    }
                    isListening.topClose = true;
                } else if (topLevelTypes.hasOwnProperty(dependency)) {
                    $DOMEventListener.trapBubbledEvent(dependency, topLevelTypes[dependency], mountAt);
                }

                isListening[dependency] = true;
            }
        }
    },

    isListeningToAllDependencies: function (registrationName, mountAt) {
        var isListening = getListeningForDocument(mountAt);
        var dependencies = EventPluginRegistry_1.registrationNameDependencies[registrationName];
        for (var i = 0; i < dependencies.length; i++) {
            var dependency = dependencies[i];
            if (!(isListening.hasOwnProperty(dependency) && isListening[dependency])) {
                return false;
            }
        }
        return true;
    },

    trapBubbledEvent: function (topLevelType, handlerBaseName, handle) {
        return $DOMEventListener.trapBubbledEvent(topLevelType, handlerBaseName, handle);
    },

    trapCapturedEvent: function (topLevelType, handlerBaseName, handle) {
        return $DOMEventListener.trapCapturedEvent(topLevelType, handlerBaseName, handle);
    }
});

var UmdBrowserEventEmitter_1 = UmdBrowserEventEmitter;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdDOMFeatureFlags
 */

var UmdDOMFeatureFlags = {
    fiberAsyncScheduling: false,
    useFiber: true
};

var UmdDOMFeatureFlags_1 = UmdDOMFeatureFlags;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule CSSProperty
 */

/**
 * CSS properties which accept numbers but are not in units of "px".
 */

var isUnitlessNumber = {
    animationIterationCount: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    columns: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowSpan: true,
    gridRowStart: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnSpan: true,
    gridColumnStart: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,

    // SVG-related properties
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true
};

/**
 * @param {string} prefix vendor-specific prefix, eg: Webkit
 * @param {string} key style name, eg: transitionDuration
 * @return {string} style name prefixed with `prefix`, properly camelCased, eg:
 * WebkitTransitionDuration
 */
function prefixKey(prefix, key) {
    return prefix + key.charAt(0).toUpperCase() + key.substring(1);
}

/**
 * Support style names that may come passed in prefixed by adding permutations
 * of vendor prefixes.
 */
var prefixes = ['Webkit', 'ms', 'Moz', 'O'];

// Using Object.keys here, or else the vanilla for-in loop makes IE8 go into an
// infinite loop, because it iterates over the newly added props too.
Object.keys(isUnitlessNumber).forEach(function (prop) {
    prefixes.forEach(function (prefix) {
        isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop];
    });
});

/**
 * Most style properties can be unset by doing .style[prop] = '' but IE8
 * doesn't like doing that with shorthand properties so for the properties that
 * IE8 breaks on, which are listed here, we instead unset each of the
 * individual properties. See http://bugs.jquery.com/ticket/12385.
 * The 4-value 'clock' properties like margin, padding, border-width seem to
 * behave without any problems. Curiously, list-style works too without any
 * special prodding.
 */
var shorthandPropertyExpansions = {
    background: {
        backgroundAttachment: true,
        backgroundColor: true,
        backgroundImage: true,
        backgroundPositionX: true,
        backgroundPositionY: true,
        backgroundRepeat: true
    },
    backgroundPosition: {
        backgroundPositionX: true,
        backgroundPositionY: true
    },
    border: {
        borderWidth: true,
        borderStyle: true,
        borderColor: true
    },
    borderBottom: {
        borderBottomWidth: true,
        borderBottomStyle: true,
        borderBottomColor: true
    },
    borderLeft: {
        borderLeftWidth: true,
        borderLeftStyle: true,
        borderLeftColor: true
    },
    borderRight: {
        borderRightWidth: true,
        borderRightStyle: true,
        borderRightColor: true
    },
    borderTop: {
        borderTopWidth: true,
        borderTopStyle: true,
        borderTopColor: true
    },
    font: {
        fontStyle: true,
        fontVariant: true,
        fontWeight: true,
        fontSize: true,
        lineHeight: true,
        fontFamily: true
    },
    outline: {
        outlineWidth: true,
        outlineStyle: true,
        outlineColor: true
    }
};

var CSSProperty = {
    isUnitlessNumber: isUnitlessNumber,
    shorthandPropertyExpansions: shorthandPropertyExpansions
};

var CSSProperty_1 = CSSProperty;

var isUnitlessNumber$1 = CSSProperty_1.isUnitlessNumber;

/**
 * Convert a value into the proper css writable value. The style name `name`
 * should be logical (no hyphens), as specified
 * in `CSSProperty.isUnitlessNumber`.
 *
 * @param {string} name CSS property name such as `topMargin`.
 * @param {*} value CSS property value such as `10px`.
 * @return {string} Normalized style value with dimensions applied.
 */
function dangerousStyleValue(name, value, isCustomProperty) {
    // Note that we've removed escapeTextForBrowser() calls here since the
    // whole string will be escaped when the attribute is injected into
    // the markup. If you provide unsafe user data here they can inject
    // arbitrary CSS which may be problematic (I couldn't repro this):
    // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    // http://www.thespanner.co.uk/2007/11/26/ultimate-xss-css-injection/
    // This is not an XSS hole but instead a potential CSS injection issue
    // which has lead to a greater discussion about how we're going to
    // trust URLs moving forward. See #2115901

    var isEmpty = value == null || typeof value === 'boolean' || value === '';
    if (isEmpty) {
        return '';
    }

    if (!isCustomProperty && typeof value === 'number' && value !== 0 && !(isUnitlessNumber$1.hasOwnProperty(name) && isUnitlessNumber$1[name])) {
        return value + 'px'; // Presumes implicit 'px' suffix for unitless numbers
    }

    return ('' + value).trim();
}

var dangerousStyleValue_1 = dangerousStyleValue;

/**
 * Copyright (c) 2016-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @providesModule describeComponentFrame
 */

var describeComponentFrame = function (name, source, ownerName) {
    return '\n    in ' + (name || 'Unknown') + (source ? ' (at ' + source.fileName.replace(/^.*[\\\/]/, '') + ':' + source.lineNumber + ')' : ownerName ? ' (created by ' + ownerName + ')' : '');
};

var IndeterminateComponent = UmdTypeOfWork.IndeterminateComponent;
var FunctionalComponent = UmdTypeOfWork.FunctionalComponent;
var ClassComponent$1 = UmdTypeOfWork.ClassComponent;
var HostComponent$2 = UmdTypeOfWork.HostComponent;




function describeFiber(fiber) {
    switch (fiber.tag) {
        case IndeterminateComponent:
        case FunctionalComponent:
        case ClassComponent$1:
        case HostComponent$2:
            var owner = fiber._debugOwner;
            var source = fiber._debugSource;
            var name = getComponentName_1(fiber);
            var ownerName = null;
            if (owner) {
                ownerName = getComponentName_1(owner);
            }
            return describeComponentFrame(name, source, ownerName);
        default:
            return '';
    }
}

// This function can only be called with a work-in-progress fiber and
// only during begin or complete phase. Do not call it under any other
// circumstances.
function getStackAddendumByWorkInProgressFiber$1(workInProgress) {
    var info = '';
    var node = workInProgress;
    do {
        info += describeFiber(node);
        // Otherwise this return pointer might point to the wrong tree:
        node = node['return'];
    } while (node);
    return info;
}

var UmdFiberComponentTreeHook = {
    getStackAddendumByWorkInProgressFiber: getStackAddendumByWorkInProgressFiber$1
};

var UmdDebugCurrentFrame = UmdGlobalSharedState_1.UmdDebugCurrentFrame;

{
    var getComponentName$3 = getComponentName_1;

    var _require2$2 = UmdFiberComponentTreeHook,
        getStackAddendumByWorkInProgressFiber = _require2$2.getStackAddendumByWorkInProgressFiber;
}

function getCurrentFiberOwnerName$2() {
    {
        var fiber = UmdDebugCurrentFiber.current;
        if (fiber === null) {
            return null;
        }
        if (fiber._debugOwner != null) {
            return getComponentName$3(fiber._debugOwner);
        }
    }
    return null;
}

function getCurrentFiberStackAddendum$1() {
    {
        var fiber = UmdDebugCurrentFiber.current;
        if (fiber === null) {
            return null;
        }
        // Safe because if current fiber exists, we are reconciling,
        // and it is guaranteed to be the work-in-progress version.
        return getStackAddendumByWorkInProgressFiber(fiber);
    }
    return null;
}

function resetCurrentFiber() {
    UmdDebugCurrentFrame.getCurrentStack = null;
    UmdDebugCurrentFiber.current = null;
    UmdDebugCurrentFiber.phase = null;
}

function setCurrentFiber(fiber, phase) {
    UmdDebugCurrentFrame.getCurrentStack = getCurrentFiberStackAddendum$1;
    UmdDebugCurrentFiber.current = fiber;
    UmdDebugCurrentFiber.phase = phase;
}

var UmdDebugCurrentFiber = {
    current: null,
    phase: null,
    resetCurrentFiber: resetCurrentFiber,
    setCurrentFiber: setCurrentFiber,
    getCurrentFiberOwnerName: getCurrentFiberOwnerName$2,
    getCurrentFiberStackAddendum: getCurrentFiberStackAddendum$1
};

var UmdDebugCurrentFiber_1 = UmdDebugCurrentFiber;

var warnValidStyle$1 = emptyFunction;

{

    // 'msTransform' is correct, but the other prefixes should be capitalized


    var badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/;

    // style values shouldn't contain a semicolon
    var badStyleValueWithSemicolonPattern = /;\s*$/;

    var warnedStyleNames = {};
    var warnedStyleValues = {};
    var warnedForNaNValue = false;
    var warnedForInfinityValue = false;

    var warnHyphenatedStyleName = function (name, owner) {
        if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
            return;
        }

        warnedStyleNames[name] = true;
    };

    var warnBadVendoredStyleName = function (name, owner) {
        if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
            return;
        }

        warnedStyleNames[name] = true;
    };

    var warnStyleValueWithSemicolon = function (name, value, owner) {
        if (warnedStyleValues.hasOwnProperty(value) && warnedStyleValues[value]) {
            return;
        }

        warnedStyleValues[value] = true;
    };

    var warnStyleValueIsNaN = function (name, value, owner) {
        if (warnedForNaNValue) {
            return;
        }

        warnedForNaNValue = true;
    };

    var warnStyleValueIsInfinity = function (name, value, owner) {
        if (warnedForInfinityValue) {
            return;
        }

        warnedForInfinityValue = true;
    };


    warnValidStyle$1 = function (name, value, component) {
        var owner;
        if (component) {
            // TODO: this only works with Stack. Seems like we need to add unit tests?
            owner = component._currentElement._owner;
        }
        if (name.indexOf('-') > -1) {
            warnHyphenatedStyleName(name, owner);
        } else if (badVendoredStyleNamePattern.test(name)) {
            warnBadVendoredStyleName(name, owner);
        } else if (badStyleValueWithSemicolonPattern.test(value)) {
            warnStyleValueWithSemicolon(name, value, owner);
        }

        if (typeof value === 'number') {
            if (isNaN(value)) {
                warnStyleValueIsNaN(name, value, owner);
            } else if (!isFinite(value)) {
                warnStyleValueIsInfinity(name, value, owner);
            }
        }
    };
}

var warnValidStyle_1 = warnValidStyle$1;

{
    var hyphenateStyleName$1 = hyphenateStyleName;
    var warnValidStyle = warnValidStyle_1;
}

var hasShorthandPropertyBug = false;
if (ExecutionEnvironment.canUseDOM) {
    var tempStyle = document.createElement('div').style;
    try {
        // IE8 throws "Invalid argument." if resetting shorthand style properties.
        tempStyle.font = '';
    } catch (e) {
        hasShorthandPropertyBug = true;
    }
}

/**
 * Operations for dealing with CSS properties.
 */
const CSSPropertyOperations = {
    /**
     * This creates a string that is expected to be equivalent to the style
     * attribute generated by server-side rendering. It by-passes warnings and
     * security checks so it's not safe to use this value for anything other than
     * comparison. It is only used in DEV for SSR validation.
     */
    createDangerousStringForStyles: function (styles) {
        {
            var serialized = '';
            var delimiter = '';
            for (var styleName in styles) {
                if (!styles.hasOwnProperty(styleName)) {
                    continue;
                }
                var styleValue = styles[styleName];
                if (styleValue != null) {
                    var isCustomProperty = styleName.indexOf('--') === 0;
                    serialized += delimiter + hyphenateStyleName$1(styleName) + ':';
                    serialized += dangerousStyleValue_1(styleName, styleValue, isCustomProperty);

                    delimiter = ';';
                }
            }
            return serialized || null;
        }
    },

    /**
     * Sets the value for multiple styles on a node.  If a value is specified as
     * '' (empty string), the corresponding style property will be unset.
     *
     * @param {DOMElement} node
     * @param {object} styles
     * @param {UmdDOMComponent} component
     */
    setValueForStyles: function (node, styles, component) {
        var style = node.style;
        for (var styleName in styles) {
            if (!styles.hasOwnProperty(styleName)) {
                continue;
            }
            var isCustomProperty = styleName.indexOf('--') === 0;
            {
                if (!isCustomProperty) {
                    warnValidStyle(styleName, styles[styleName], component);
                }
            }
            var styleValue = dangerousStyleValue_1(styleName, styles[styleName], isCustomProperty);
            if (styleName === 'float') {
                styleName = 'cssFloat';
            }
            if (isCustomProperty) {
                style.setProperty(styleName, styleValue);
            } else if (styleValue) {
                style[styleName] = styleValue;
            } else {
                var expansion = hasShorthandPropertyBug && CSSProperty_1.shorthandPropertyExpansions[styleName];
                if (expansion) {
                    // Shorthand property that IE8 won't like unsetting, so unset each
                    // component to placate it
                    for (var individualStyleName in expansion) {
                        style[individualStyleName] = '';
                    }
                } else {
                    style[styleName] = '';
                }
            }
        }
    }
};



var UmdHostOperationHistoryHook = null;

{
    var history = [];

    UmdHostOperationHistoryHook = {
        onHostOperation: function (operation) {
            history.push(operation);
        },
        clearHistory: function () {
            if (UmdHostOperationHistoryHook._preventClearing) {
                // Should only be used for tests.
                return;
            }

            history = [];
        },
        getHistory: function () {
            return history;
        }
    };
}

var VALID_ATTRIBUTE_NAME_REGEX = new RegExp('^[' + DOMProperty.ATTRIBUTE_NAME_START_CHAR + '][' + DOMProperty.ATTRIBUTE_NAME_CHAR + "]*$");
var illegalAttributeNameCache = {};
var validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
    if (validatedAttributeNameCache.hasOwnProperty(attributeName)) {
        return true;
    }
    if (illegalAttributeNameCache.hasOwnProperty(attributeName)) {
        return false;
    }
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
        validatedAttributeNameCache[attributeName] = true;
        return true;
    }
    illegalAttributeNameCache[attributeName] = true;
    return false;
}


function shouldIgnoreValue(propertyInfo, value) {
    return value == null || propertyInfo.hasBooleanValue && !value || propertyInfo.hasNumericValue && isNaN(value) || propertyInfo.hasPositiveNumericValue && value < 1 || propertyInfo.hasOverloadedBooleanValue && value === false;
}

/**
 * Operations for dealing with DOM properties.
 */
var DOMPropertyOperations = {
    setAttributeForID: function (node, id) {
        node.setAttribute(DOMProperty.ID_ATTRIBUTE_NAME, id);
    },

    setAttributeForRoot: function (node) {
        node.setAttribute(DOMProperty.ROOT_ATTRIBUTE_NAME, '');
    },

    /**
     * Get the value for a property on a node. Only used in DEV for SSR validation.
     * The "expected" argument is used as a hint of what the expected value is.
     * Some properties have multiple equivalent values.
     */
    getValueForProperty: function (node, name, expected) {
        {
            var propertyInfo = DOMProperty.getPropertyInfo(name);
            if (propertyInfo) {
                var mutationMethod = propertyInfo.mutationMethod;
                if (mutationMethod || propertyInfo.mustUseProperty) {
                    return node[propertyInfo.propertyName];
                } else {
                    var attributeName = propertyInfo.attributeName;

                    var stringValue = null;

                    if (propertyInfo.hasOverloadedBooleanValue) {
                        if (node.hasAttribute(attributeName)) {
                            var value = node.getAttribute(attributeName);
                            if (value === '') {
                                return true;
                            }
                            if (shouldIgnoreValue(propertyInfo, expected)) {
                                return value;
                            }
                            if (value === '' + expected) {
                                return expected;
                            }
                            return value;
                        }
                    } else if (node.hasAttribute(attributeName)) {
                        if (shouldIgnoreValue(propertyInfo, expected)) {
                            // We had an attribute but shouldn't have had one, so read it
                            // for the error message.
                            return node.getAttribute(attributeName);
                        }
                        if (propertyInfo.hasBooleanValue) {
                            // If this was a boolean, it doesn't matter what the value is
                            // the fact that we have it is the same as the expected.
                            return expected;
                        }
                        // Even if this property uses a namespace we use getAttribute
                        // because we assume its namespaced name is the same as our config.
                        // To use getAttributeNS we need the local name which we don't have
                        // in our config atm.
                        stringValue = node.getAttribute(attributeName);
                    }

                    if (shouldIgnoreValue(propertyInfo, expected)) {
                        return stringValue === null ? expected : stringValue;
                    } else if (stringValue === '' + expected) {
                        return expected;
                    } else {
                        return stringValue;
                    }
                }
            }
        }
    },

    /**
     * Get the value for a attribute on a node. Only used in DEV for SSR validation.
     * The third argument is used as a hint of what the expected value is. Some
     * attributes have multiple equivalent values.
     */
    getValueForAttribute: function (node, name, expected) {
        {
            if (!isAttributeNameSafe(name)) {
                return;
            }
            if (!node.hasAttribute(name)) {
                return expected === undefined ? undefined : null;
            }
            var value = node.getAttribute(name);
            if (value === '' + expected) {
                return expected;
            }
            return value;
        }
    },

    /**
     * Sets the value for a property on a node.
     *
     * @param {DOMElement} node
     * @param {string} name
     * @param {*} value
     */
    setValueForProperty: function (node, name, value) {
        var propertyInfo = DOMProperty.getPropertyInfo(name);

        if (propertyInfo && DOMProperty.shouldSetAttribute(name, value)) {
            var mutationMethod = propertyInfo.mutationMethod;
            if (mutationMethod) {
                mutationMethod(node, value);
            } else if (shouldIgnoreValue(propertyInfo, value)) {
                DOMPropertyOperations.deleteValueForProperty(node, name);
                return;
            } else if (propertyInfo.mustUseProperty) {
                // Contrary to `setAttribute`, object properties are properly
                // `toString`ed by IE8/9.
                node[propertyInfo.propertyName] = value;
            } else {
                var attributeName = propertyInfo.attributeName;
                var namespace = propertyInfo.attributeNamespace;
                // `setAttribute` with objects becomes only `[object]` in IE8/9,
                // ('' + value) makes it output the correct toString()-value.
                if (namespace) {
                    node.setAttributeNS(namespace, attributeName, '' + value);
                } else if (propertyInfo.hasBooleanValue || propertyInfo.hasOverloadedBooleanValue && value === true) {
                    node.setAttribute(attributeName, '');
                } else {
                    node.setAttribute(attributeName, '' + value);
                }
            }
        } else {
            DOMPropertyOperations.setValueForAttribute(node, name, DOMProperty.shouldSetAttribute(name, value) ? value : null);
            return;
        }


    },

    setValueForAttribute: function (node, name, value) {
        if (!isAttributeNameSafe(name)) {
            return;
        }
        if (value == null) {
            node.removeAttribute(name);
        } else {
            node.setAttribute(name, '' + value);
        }


    },

    /**
     * Deletes an attributes from a node.
     *
     * @param {DOMElement} node
     * @param {string} name
     */
    deleteValueForAttribute: function (node, name) {
        node.removeAttribute(name);

    },

    /**
     * Deletes the value for a property on a node.
     *
     * @param {DOMElement} node
     * @param {string} name
     */
    deleteValueForProperty: function (node, name) {
        var propertyInfo = DOMProperty.getPropertyInfo(name);
        if (propertyInfo) {
            var mutationMethod = propertyInfo.mutationMethod;
            if (mutationMethod) {
                mutationMethod(node, undefined);
            } else if (propertyInfo.mustUseProperty) {
                var propName = propertyInfo.propertyName;
                if (propertyInfo.hasBooleanValue) {
                    node[propName] = false;
                } else {
                    node[propName] = '';
                }
            } else {
                node.removeAttribute(propertyInfo.attributeName);
            }
        } else {
            node.removeAttribute(name);
        }


    }
};

var DOMPropertyOperations_1 = DOMPropertyOperations;

var didWarnControlledToUncontrolled = false;
var didWarnUncontrolledToControlled = false;

function isControlled(props) {
    var usesChecked = props.type === 'checkbox' || props.type === 'radio';
    return usesChecked ? props.checked != null : props.value != null;
}

var UmdDOMInput = {
    getHostProps: function (element, props) {
        var node = element;
        var value = props.value;
        var checked = props.checked;

        var hostProps = _assign({
            // Make sure we set .type before any other properties (setting .value
            // before .type means .value is lost in IE11 and below)
            type: undefined,
            // Make sure we set .step before .value (setting .value before .step
            // means .value is rounded on mount, based upon step precision)
            step: undefined,
            // Make sure we set .min & .max before .value (to ensure proper order
            // in corner cases such as min or max deriving from value, e.g. Issue #7170)
            min: undefined,
            max: undefined
        }, props, {
            defaultChecked: undefined,
            defaultValue: undefined,
            value: value != null ? value : node._wrapperState.initialValue,
            checked: checked != null ? checked : node._wrapperState.initialChecked
        });

        return hostProps;
    },

    initWrapperState: function (element, props) {

        var defaultValue = props.defaultValue;
        var node = element;
        node._wrapperState = {
            initialChecked: props.checked != null ? props.checked : props.defaultChecked,
            initialValue: props.value != null ? props.value : defaultValue,
            controlled: isControlled(props)
        };
    },

    updateWrapper: function (element, props) {
        var node = element;
        {
            var controlled = isControlled(props);

            if (!node._wrapperState.controlled && controlled && !didWarnUncontrolledToControlled) {
                didWarnUncontrolledToControlled = true;
            }
            if (node._wrapperState.controlled && !controlled && !didWarnControlledToUncontrolled) {
                didWarnControlledToUncontrolled = true;
            }
        }

        var checked = props.checked;
        if (checked != null) {
            DOMPropertyOperations_1.setValueForProperty(node, 'checked', checked || false);
        }

        var value = props.value;
        if (value != null) {
            if (value === 0 && node.value === '') {
                node.value = '0';
                // Note: IE9 reports a number inputs as 'text', so check props instead.
            } else if (props.type === 'number') {
                // Simulate `input.valueAsNumber`. IE9 does not support it
                var valueAsNumber = parseFloat(node.value) || 0;

                if (
                    // eslint-disable-next-line
                    value != valueAsNumber ||
                    // eslint-disable-next-line
                    value == valueAsNumber && node.value != value) {
                    // Cast `value` to a string to ensure the value is set correctly. While
                    // browsers typically do this as necessary, jsdom doesn't.
                    node.value = '' + value;
                }
            } else if (node.value !== '' + value) {
                // Cast `value` to a string to ensure the value is set correctly. While
                // browsers typically do this as necessary, jsdom doesn't.
                node.value = '' + value;
            }
        } else {
            if (props.value == null && props.defaultValue != null) {
                // In Chrome, assigning defaultValue to certain input types triggers input validation.
                // For number inputs, the display value loses trailing decimal points. For email inputs,
                // Chrome raises "The specified value <x> is not a valid email address".
                //
                // Here we check to see if the defaultValue has actually changed, avoiding these problems
                // when the user is inputting text
                //
                // https://github.com/facebook/umd/issues/7253
                if (node.defaultValue !== '' + props.defaultValue) {
                    node.defaultValue = '' + props.defaultValue;
                }
            }
            if (props.checked == null && props.defaultChecked != null) {
                node.defaultChecked = !!props.defaultChecked;
            }
        }
    },

    postMountWrapper: function (element, props) {
        var node = element;

        // Detach value from defaultValue. We won't do anything if we're working on
        // submit or reset inputs as those values & defaultValues are linked. They
        // are not resetable nodes so this operation doesn't matter and actually
        // removes browser-default values (eg "Submit Query") when no value is
        // provided.

        switch (props.type) {
            case 'submit':
            case 'reset':
                break;
            case 'color':
            case 'date':
            case 'datetime':
            case 'datetime-local':
            case 'month':
            case 'time':
            case 'week':
                // This fixes the no-show issue on iOS Safari and Android Chrome:
                // https://github.com/facebook/umd/issues/7233
                node.value = '';
                node.value = node.defaultValue;
                break;
            default:
                node.value = node.value;
                break;
        }

        // Normally, we'd just do `node.checked = node.checked` upon initial mount, less this bug
        // this is needed to work around a chrome bug where setting defaultChecked
        // will sometimes influence the value of checked (even after detachment).
        // Reference: https://bugs.chromium.org/p/chromium/issues/detail?id=608416
        // We need to temporarily unset name to avoid disrupting radio button groups.
        var name = node.name;
        if (name !== '') {
            node.name = '';
        }
        node.defaultChecked = !node.defaultChecked;
        node.defaultChecked = !node.defaultChecked;
        if (name !== '') {
            node.name = name;
        }
    },

    restoreControlledState: function (element, props) {
        var node = element;
        UmdDOMInput.updateWrapper(node, props);
        updateNamedCousins(node, props);
    }
};

function updateNamedCousins(rootNode, props) {
    var name = props.name;
    if (props.type === 'radio' && name != null) {
        var queryRoot = rootNode;

        while (queryRoot.parentNode) {
            queryRoot = queryRoot.parentNode;
        }

        // If `rootNode.form` was non-null, then we could try `form.elements`,
        // but that sometimes behaves strangely in IE8. We could also try using
        // `form.getElementsByName`, but that will only return direct children
        // and won't include inputs that use the HTML5 `form=` attribute. Since
        // the input might not even be in a form. It might not even be in the
        // document. Let's just use the local `querySelectorAll` to ensure we don't
        // miss anything.
        var group = queryRoot.querySelectorAll('input[name=' + JSON.stringify('' + name) + '][type="radio"]');

        for (var i = 0; i < group.length; i++) {
            var otherNode = group[i];
            if (otherNode === rootNode || otherNode.form !== rootNode.form) {
                continue;
            }
            // This will throw if radio buttons rendered by different copies of Umd
            // and the same name are rendered into the same form (same as #1939).
            // That's probably okay; we don't support it just as we don't support
            // mixing Umd radio buttons with non-Umd ones.
            var otherProps = UmdDOMComponentTree_1.getFiberCurrentPropsFromNode(otherNode);
            // If this is a controlled radio button group, forcing the input that
            // was previously checked to update will cause it to be come re-checked
            // as appropriate.
            UmdDOMInput.updateWrapper(otherNode, otherProps);
        }
    }
}

var $DOMFiberInput = UmdDOMInput;

function flattenChildren(children) {
    var content = '';

    // Flatten children and warn if they aren't strings or numbers;
    // invalid types are ignored.
    // We can silently skip them because invalid DOM nesting warning
    // catches these cases in Fiber.
    _element.Children.forEach(children, function (child) {
        if (child == null) {
            return;
        }
        if (typeof child === 'string' || typeof child === 'number') {
            content += child;
        }
    });

    return content;
}

/**
 * Implements an <option> host component that warns when `selected` is set.
 */
var UmdDOMOption = {
    validateProps: function (element, props) {


    },

    postMountWrapper: function (element, props) {
        // value="" should make a value attribute (#6219)
        if (props.value != null) {
            element.setAttribute('value', props.value);
        }
    },

    getHostProps: function (element, props) {
        var hostProps = _assign({ children: undefined }, props);

        var content = flattenChildren(props.children);

        if (content) {
            hostProps.children = content;
        }

        return hostProps;
    }
};

var $DOMFiberOption = UmdDOMOption;

{
    var didWarnValueDefaultValue$1 = false;
}

function updateOptions(node, multiple, propValue) {
    var options = node.options;

    if (multiple) {
        var selectedValues = propValue;
        var selectedValue = {};
        for (var i = 0; i < selectedValues.length; i++) {
            // Prefix to avoid chaos with special keys.
            selectedValue["$" + selectedValues[i]] = true;
        }
        for (var _i = 0; _i < options.length; _i++) {
            var selected = selectedValue.hasOwnProperty("$" + options[_i].value);
            if (options[_i].selected !== selected) {
                options[_i].selected = selected;
            }
        }
    } else {
        // Do not set `select.value` as exact behavior isn't consistent across all
        // browsers for all cases.
        var _selectedValue = '' + propValue;
        var defaultSelected = null;
        for (var _i2 = 0; _i2 < options.length; _i2++) {
            if (options[_i2].value === _selectedValue) {
                options[_i2].selected = true;
                return;
            }
            if (defaultSelected === null && !options[_i2].disabled) {
                defaultSelected = options[_i2];
            }
        }
        if (defaultSelected !== null) {
            defaultSelected.selected = true;
        }
    }
}

var UmdDOMSelect = {
    getHostProps: function (element, props) {
        return _assign({}, props, {
            value: undefined
        });
    },

    initWrapperState: function (element, props) {
        var node = element;

        var value = props.value;
        node._wrapperState = {
            initialValue: value != null ? value : props.defaultValue,
            wasMultiple: !!props.multiple
        };

        {
            if (props.value !== undefined && props.defaultValue !== undefined && !didWarnValueDefaultValue$1) {
                didWarnValueDefaultValue$1 = true;
            }
        }
    },

    postMountWrapper: function (element, props) {
        var node = element;
        node.multiple = !!props.multiple;
        var value = props.value;
        if (value != null) {
            updateOptions(node, !!props.multiple, value);
        } else if (props.defaultValue != null) {
            updateOptions(node, !!props.multiple, props.defaultValue);
        }
    },

    postUpdateWrapper: function (element, props) {
        var node = element;
        // After the initial mount, we control selected-ness manually so don't pass
        // this value down
        node._wrapperState.initialValue = undefined;

        var wasMultiple = node._wrapperState.wasMultiple;
        node._wrapperState.wasMultiple = !!props.multiple;

        var value = props.value;
        if (value != null) {
            updateOptions(node, !!props.multiple, value);
        } else if (wasMultiple !== !!props.multiple) {
            // For simplicity, reapply `defaultValue` if `multiple` is toggled.
            if (props.defaultValue != null) {
                updateOptions(node, !!props.multiple, props.defaultValue);
            } else {
                // Revert the select back to its default unselected state.
                updateOptions(node, !!props.multiple, props.multiple ? [] : '');
            }
        }
    },

    restoreControlledState: function (element, props) {
        var node = element;
        var value = props.value;

        if (value != null) {
            updateOptions(node, !!props.multiple, value);
        }
    }
};

var $DOMFiberSelect = UmdDOMSelect;


/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule inputValueTracking
 * 
 */

function isCheckable(elem) {
    var type = elem.type;
    var nodeName = elem.nodeName;
    return nodeName && nodeName.toLowerCase() === 'input' && (type === 'checkbox' || type === 'radio');
}

function getTracker(node) {
    return node._valueTracker;
}

function detachTracker(node) {
    node._valueTracker = null;
}

function getValueFromNode(node) {
    var value = '';
    if (!node) {
        return value;
    }

    if (isCheckable(node)) {
        value = node.checked ? 'true' : 'false';
    } else {
        value = node.value;
    }

    return value;
}

function trackValueOnNode(node) {
    var valueField = isCheckable(node) ? 'checked' : 'value';
    var descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField);

    var currentValue = '' + node[valueField];

    // if someone has already defined a value or Safari, then bail
    // and don't track value will cause over reporting of changes,
    // but it's better then a hard failure
    // (needed for certain tests that spyOn input values and Safari)
    if (node.hasOwnProperty(valueField) || typeof descriptor.get !== 'function' || typeof descriptor.set !== 'function') {
        return;
    }

    Object.defineProperty(node, valueField, {
        enumerable: descriptor.enumerable,
        configurable: true,
        get: function () {
            return descriptor.get.call(this);
        },
        set: function (value) {
            currentValue = '' + value;
            descriptor.set.call(this, value);
        }
    });

    var tracker = {
        getValue: function () {
            return currentValue;
        },
        setValue: function (value) {
            currentValue = '' + value;
        },
        stopTracking: function () {
            detachTracker(node);
            delete node[valueField];
        }
    };
    return tracker;
}

var inputValueTracking = {
    // exposed for testing
    _getTrackerFromNode: getTracker,

    track: function (node) {
        if (getTracker(node)) {
            return;
        }

        // TODO: Once it's just Fiber we can move this to node._wrapperState
        node._valueTracker = trackValueOnNode(node);
    },
    updateValueIfChanged: function (node) {
        if (!node) {
            return false;
        }

        var tracker = getTracker(node);
        // if there is no tracker at this point it's unlikely
        // that trying again will succeed
        if (!tracker) {
            return true;
        }

        var lastValue = tracker.getValue();
        var nextValue = getValueFromNode(node);
        if (nextValue !== lastValue) {
            tracker.setValue(nextValue);
            return true;
        }
        return false;
    },
    stopTracking: function (node) {
        var tracker = getTracker(node);
        if (tracker) {
            tracker.stopTracking();
        }
    }
};

var inputValueTracking_1 = inputValueTracking;



/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule createMicrosoftUnsafeLocalFunction
 */

/* globals MSApp */

/**
 * Create a function which has 'unsafe' privileges (required by windows8 apps)
 */

var createMicrosoftUnsafeLocalFunction = function (func) {
    if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {
        return function (arg0, arg1, arg2, arg3) {
            MSApp.execUnsafeLocalFunction(function () {
                return func(arg0, arg1, arg2, arg3);
            });
        };
    } else {
        return func;
    }
};

var createMicrosoftUnsafeLocalFunction_1 = createMicrosoftUnsafeLocalFunction;

var Namespaces$1 = DOMNamespaces.Namespaces;


// SVG temp container for IE lacking innerHTML
var reusableSVGContainer;

/**
 * Set the innerHTML property of a node
 *
 * @param {DOMElement} node
 * @param {string} html
 * @internal
 */
var setInnerHTML = createMicrosoftUnsafeLocalFunction_1(function (node, html) {
    // IE does not have innerHTML for SVG nodes, so instead we inject the
    // new markup in a temp node and then move the child nodes across into
    // the target node
    if (node.namespaceURI === Namespaces$1.svg && !('innerHTML' in node)) {
        reusableSVGContainer = reusableSVGContainer || document.createElement('div');
        reusableSVGContainer.innerHTML = '<svg>' + html + '</svg>';
        var svgNode = reusableSVGContainer.firstChild;
        while (svgNode.firstChild) {
            node.appendChild(svgNode.firstChild);
        }
    } else {
        node.innerHTML = html;
    }
});

var setInnerHTML_1 = setInnerHTML;

/**
 * Copyright (c) 2016-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on the escape-html library, which is used under the MIT License below:
 *
 * Copyright (c) 2012-2013 TJ Holowaychuk
 * Copyright (c) 2015 Andreas Lubbe
 * Copyright (c) 2015 Tiancheng "Timothy" Gu
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * @providesModule escapeTextContentForBrowser
 */

// code copied and modified from escape-html
/**
 * Module variables.
 * @private
 */

var matchHtmlRegExp = /["'&<>]/;

/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} string The string to escape for inserting into HTML
 * @return {string}
 * @public
 */

function escapeHtml(string) {
    var str = '' + string;
    var match = matchHtmlRegExp.exec(str);

    if (!match) {
        return str;
    }

    var escape;
    var html = '';
    var index = 0;
    var lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34:
                // "
                escape = '&quot;';
                break;
            case 38:
                // &
                escape = '&amp;';
                break;
            case 39:
                // '
                escape = '&#x27;'; // modified from escape-html; used to be '&#39'
                break;
            case 60:
                // <
                escape = '&lt;';
                break;
            case 62:
                // >
                escape = '&gt;';
                break;
            default:
                continue;
        }

        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
// end code copied and modified from escape-html

/**
 * Escapes text to prevent scripting attacks.
 *
 * @param {*} text Text value to escape.
 * @return {string} An escaped string.
 */
function escapeTextContentForBrowser(text) {
    if (typeof text === 'boolean' || typeof text === 'number') {
        // this shortcircuit helps perf for types that we know will never have
        // special characters, especially given that this function is used often
        // for numeric dom ids.
        return '' + text;
    }
    return escapeHtml(text);
}

var escapeTextContentForBrowser_1 = escapeTextContentForBrowser;

var TEXT_NODE$2 = HTMLNodeType_1.TEXT_NODE;

/**
 * Set the textContent property of a node, ensuring that whitespace is preserved
 * even in IE8. innerText is a poor substitute for textContent and, among many
 * issues, inserts <br> instead of the literal newline chars. innerHTML behaves
 * as it should.
 *
 * @param {DOMElement} node
 * @param {string} text
 * @internal
 */


var setTextContent = function (node, text) {
    if (text) {
        var firstChild = node.firstChild;

        if (firstChild && firstChild === node.lastChild && firstChild.nodeType === TEXT_NODE$2) {
            firstChild.nodeValue = text;
            return;
        }
    }
    node.textContent = text;
};

if (ExecutionEnvironment.canUseDOM) {
    if (!('textContent' in document.documentElement)) {
        setTextContent = function (node, text) {
            if (node.nodeType === TEXT_NODE$2) {
                node.nodeValue = text;
                return;
            }
            setInnerHTML_1(node, escapeTextContentForBrowser_1(text));
        };
    }
}

var setTextContent_1 = setTextContent;


{
    var warnedProperties$1 = {};
    var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
    var EVENT_NAME_REGEX = /^on[A-Z]/;
    var rARIA$1 = new RegExp('^(aria)-[' + DOMProperty.ATTRIBUTE_NAME_CHAR + "]*$");
    var rARIACamel$1 = new RegExp('^(aria)[A-Z][' + DOMProperty.ATTRIBUTE_NAME_CHAR + "]*$");
    var possibleStandardNames = _possibleStandardNames;

    var validateProperty$1 = function (tagName, name, value, debugID) {
        if (hasOwnProperty$1.call(warnedProperties$1, name) && warnedProperties$1[name]) {
            return true;
        }

        if (EventPluginRegistry_1.registrationNameModules.hasOwnProperty(name)) {
            return true;
        }

        if (EventPluginRegistry_1.plugins.length === 0 && EVENT_NAME_REGEX.test(name)) {
            // If no event plugins have been injected, we might be in a server environment.
            // Don't check events in this case.
            return true;
        }

        var lowerCasedName = name.toLowerCase();
        var registrationName = EventPluginRegistry_1.possibleRegistrationNames.hasOwnProperty(lowerCasedName) ? EventPluginRegistry_1.possibleRegistrationNames[lowerCasedName] : null;

        if (registrationName != null) {
            warnedProperties$1[name] = true;
            return true;
        }

        if (lowerCasedName.indexOf('on') === 0) {
            warnedProperties$1[name] = true;
            return true;
        }

        // Let the ARIA attribute hook validate ARIA attributes
        if (rARIA$1.test(name) || rARIACamel$1.test(name)) {
            return true;
        }

        if (lowerCasedName === 'onfocusin' || lowerCasedName === 'onfocusout') {
            warnedProperties$1[name] = true;
            return true;
        }

        if (lowerCasedName === 'innerhtml') {
            warnedProperties$1[name] = true;
            return true;
        }

        if (lowerCasedName === 'aria') {
            warnedProperties$1[name] = true;
            return true;
        }

        if (lowerCasedName === 'is' && value !== null && value !== undefined && typeof value !== 'string') {
            warnedProperties$1[name] = true;
            return true;
        }

        if (typeof value === 'number' && isNaN(value)) {
            warnedProperties$1[name] = true;
            return true;
        }

        var isReserved = DOMProperty.isReservedProp(name);

        // Known attributes should match the casing specified in the property config.
        if (possibleStandardNames.hasOwnProperty(lowerCasedName)) {
            var standardName = possibleStandardNames[lowerCasedName];
            if (standardName !== name) {
                warnedProperties$1[name] = true;
                return true;
            }
        } else if (!isReserved && name !== lowerCasedName) {
            // Unknown attributes should have lowercase casing since that's how they
            // will be cased anyway with server rendering.
            warnedProperties$1[name] = true;
            return true;
        }

        if (typeof value === 'boolean') {
            warnedProperties$1[name] = true;
            return true;
        }

        // Now that we've validated casing, do not validate
        // data types for reserved props
        if (isReserved) {
            return true;
        }

        // Warn when a known attribute is a bad type
        if (!DOMProperty.shouldSetAttribute(name, value)) {
            warnedProperties$1[name] = true;
            return false;
        }

        return true;
    };
}


var DOCUMENT_NODE$1 = HTMLNodeType_1.DOCUMENT_NODE;
var DOCUMENT_FRAGMENT_NODE$1 = HTMLNodeType_1.DOCUMENT_FRAGMENT_NODE;



var didWarnInvalidHydration = false;


var listenTo = UmdBrowserEventEmitter_1.listenTo;
var registrationNameModules = EventPluginRegistry_1.registrationNameModules;

var DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
var SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
var CHILDREN = 'children';
var STYLE = 'style';
var HTML = '__html';

var HTML_NAMESPACE$1 = DOMNamespaces.Namespaces.html;
var getIntrinsicNamespace$1 = DOMNamespaces.getIntrinsicNamespace;


{
    var warnedUnknownTags = {
        // Chrome is the only major browser not shipping <time>. But as of July
        // 2017 it intends to ship it due to widespread usage. We intentionally
        // *don't* warn for <time> even if it's unrecognized by Chrome because
        // it soon will be, and many apps have been using it anyway.
        time: true
    };



    var warnForTextDifference = function (serverText, clientText) {
        if (didWarnInvalidHydration) {
            return;
        }
        didWarnInvalidHydration = true;
    };

    var warnForPropDifference = function (propName, serverValue, clientValue) {
        if (didWarnInvalidHydration) {
            return;
        }
        didWarnInvalidHydration = true;
    };

    var warnForExtraAttributes = function (attributeNames) {
        if (didWarnInvalidHydration) {
            return;
        }
        didWarnInvalidHydration = true;
        var names = [];
        attributeNames.forEach(function (name) {
            names.push(name);
        });
    };



    var testDocument;
    // Parse the HTML and read it back to normalize the HTML string so that it
    // can be used for comparison.
    var normalizeHTML = function (parent, html) {
        if (!testDocument) {
            testDocument = document.implementation.createHTMLDocument();
        }
        var testElement = parent.namespaceURI === HTML_NAMESPACE$1 ? testDocument.createElement(parent.tagName) : testDocument.createElementNS(parent.namespaceURI, parent.tagName);
        testElement.innerHTML = html;
        return testElement.innerHTML;
    };
}

function ensureListeningTo(rootContainerElement, registrationName) {
    var isDocumentOrFragment = rootContainerElement.nodeType === DOCUMENT_NODE$1 || rootContainerElement.nodeType === DOCUMENT_FRAGMENT_NODE$1;
    var doc = isDocumentOrFragment ? rootContainerElement : rootContainerElement.ownerDocument;
    listenTo(registrationName, doc);
}

function getOwnerDocumentFromRootContainer(rootContainerElement) {
    return rootContainerElement.nodeType === DOCUMENT_NODE$1 ? rootContainerElement : rootContainerElement.ownerDocument;
}

// There are so many media events, it makes sense to just
// maintain a list rather than create a `trapBubbledEvent` for each
const mediaEvents = {
    topAbort: 'abort',
    topCanPlay: 'canplay',
    topCanPlayThrough: 'canplaythrough',
    topDurationChange: 'durationchange',
    topEmptied: 'emptied',
    topEncrypted: 'encrypted',
    topEnded: 'ended',
    topError: 'error',
    topLoadedData: 'loadeddata',
    topLoadedMetadata: 'loadedmetadata',
    topLoadStart: 'loadstart',
    topPause: 'pause',
    topPlay: 'play',
    topPlaying: 'playing',
    topProgress: 'progress',
    topRateChange: 'ratechange',
    topSeeked: 'seeked',
    topSeeking: 'seeking',
    topStalled: 'stalled',
    topSuspend: 'suspend',
    topTimeUpdate: 'timeupdate',
    topVolumeChange: 'volumechange',
    topWaiting: 'waiting'
};

function trapClickOnNonInteractiveElement(node) {
    node.onclick = emptyFunction;
}

function setInitialDOMProperties(domElement, rootContainerElement, nextProps) {
    for (var propKey in nextProps) {
        if (!nextProps.hasOwnProperty(propKey)) {
            continue;
        }
        var nextProp = nextProps[propKey];
        if (propKey === STYLE) {
            {
                if (nextProp) {
                    // Freeze the next style object so that we can assume it won't be
                    // mutated. We have already warned for this in the past.
                    Object.freeze(nextProp);
                }
            }
            // Relies on `updateStylesByID` not mutating `styleUpdates`.
            CSSPropertyOperations.setValueForStyles(domElement, nextProp);
        } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
            var nextHtml = nextProp ? nextProp[HTML] : undefined;
            if (nextHtml != null) {
                setInnerHTML_1(domElement, nextHtml);
            }
        } else if (propKey === CHILDREN) {
            if (typeof nextProp === 'string') {
                setTextContent_1(domElement, nextProp);
            } else if (typeof nextProp === 'number') {
                setTextContent_1(domElement, '' + nextProp);
            }
        } else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING) {
            // Noop
        } else if (registrationNameModules.hasOwnProperty(propKey)) {
            if (nextProp != null) {

                ensureListeningTo(rootContainerElement, propKey);
            }
        } else if (nextProp != null) {
            DOMPropertyOperations_1.setValueForProperty(domElement, propKey, nextProp);
        }
    }
}

function updateDOMProperties(domElement, updatePayload) {
    for (var i = 0; i < updatePayload.length; i += 2) {
        var propKey = updatePayload[i];
        var propValue = updatePayload[i + 1];
        if (propKey === STYLE) {
            CSSPropertyOperations.setValueForStyles(domElement, propValue);
        } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
            setInnerHTML_1(domElement, propValue);
        } else if (propKey === CHILDREN) {
            setTextContent_1(domElement, propValue);
        } else if (propValue != null) {
            DOMPropertyOperations_1.setValueForProperty(domElement, propKey, propValue);
        } else {
            DOMPropertyOperations_1.deleteValueForProperty(domElement, propKey);
        }
    }
}

var $DOMFiberComponent = {
    createElement: function (type, props, rootContainerElement, parentNamespace) {
        // We create tags in the namespace of their parent container, except HTML
        var ownerDocument = getOwnerDocumentFromRootContainer(rootContainerElement);
        var domElement;
        var namespaceURI = parentNamespace;
        if (namespaceURI === HTML_NAMESPACE$1) {
            namespaceURI = getIntrinsicNamespace$1(type);
        }
        if (namespaceURI === HTML_NAMESPACE$1) {

            if (type === 'script') {
                // Create the script via .innerHTML so its "parser-inserted" flag is
                // set to true and it does not execute
                var div = ownerDocument.createElement('div');
                div.innerHTML = '<script><' + '/script>'; // eslint-disable-line
                // This is guaranteed to yield a script element.
                var firstChild = div.firstChild;
                domElement = div.removeChild(firstChild);
            } else if (typeof props.is === 'string') {
                // $FlowIssue `createElement` should be updated for Web Components
                domElement = ownerDocument.createElement(type, { is: props.is });
            } else {
                // Separate else branch instead of using `props.is || undefined` above because of a Firefox bug.
                // See discussion in https://github.com/facebook/umd/pull/6896
                // and discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1276240
                domElement = ownerDocument.createElement(type);
            }
        } else {
            domElement = ownerDocument.createElementNS(namespaceURI, type);
        }

        {
            if (namespaceURI === HTML_NAMESPACE$1) {
                if (Object.prototype.toString.call(domElement) === '[object HTMLUnknownElement]' && !Object.prototype.hasOwnProperty.call(warnedUnknownTags, type)) {
                    warnedUnknownTags[type] = true;
                }
            }
        }

        return domElement;
    },
    createTextNode: function (text, rootContainerElement) {
        return getOwnerDocumentFromRootContainer(rootContainerElement).createTextNode(text);
    },
    setInitialProperties: function (domElement, tag, rawProps, rootContainerElement) {
        var props;
        switch (tag) {
            case 'iframe':
            case 'object':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topLoad', 'load', domElement);
                props = rawProps;
                break;
            case 'video':
            case 'audio':
                // Create listener for each media event
                for (var event in mediaEvents) {
                    if (mediaEvents.hasOwnProperty(event)) {
                        UmdBrowserEventEmitter_1.trapBubbledEvent(event, mediaEvents[event], domElement);
                    }
                }
                props = rawProps;
                break;
            case 'source':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topError', 'error', domElement);
                props = rawProps;
                break;
            case 'img':
            case 'image':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topError', 'error', domElement);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topLoad', 'load', domElement);
                props = rawProps;
                break;
            case 'form':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topReset', 'reset', domElement);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topSubmit', 'submit', domElement);
                props = rawProps;
                break;
            case 'details':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topToggle', 'toggle', domElement);
                props = rawProps;
                break;
            case 'input':
                $DOMFiberInput.initWrapperState(domElement, rawProps);
                props = $DOMFiberInput.getHostProps(domElement, rawProps);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topInvalid', 'invalid', domElement);
                // For controlled components we always need to ensure we're listening
                // to onChange. Even if there is no listener.
                ensureListeningTo(rootContainerElement, 'onChange');
                break;
            case 'option':
                $DOMFiberOption.validateProps(domElement, rawProps);
                props = $DOMFiberOption.getHostProps(domElement, rawProps);
                break;
            case 'select':
                $DOMFiberSelect.initWrapperState(domElement, rawProps);
                props = $DOMFiberSelect.getHostProps(domElement, rawProps);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topInvalid', 'invalid', domElement);
                // For controlled components we always need to ensure we're listening
                // to onChange. Even if there is no listener.
                ensureListeningTo(rootContainerElement, 'onChange');
                break;

            default:
                props = rawProps;
        }


        setInitialDOMProperties(domElement, rootContainerElement, props);

        switch (tag) {
            case 'input':
                // TODO: Make sure we check if this is still unmounted or do any clean
                // up necessary since we never stop tracking anymore.
                inputValueTracking_1.track(domElement);
                $DOMFiberInput.postMountWrapper(domElement, rawProps);
                break;

            case 'option':
                $DOMFiberOption.postMountWrapper(domElement, rawProps);
                break;
            case 'select':
                $DOMFiberSelect.postMountWrapper(domElement, rawProps);
                break;
            default:
                if (typeof props.onClick === 'function') {
                    // TODO: This cast may not be sound for SVG, MathML or custom elements.
                    trapClickOnNonInteractiveElement(domElement);
                }
                break;
        }
    },


    // Calculate the diff between the two objects.
    diffProperties: function (domElement, tag, lastRawProps, nextRawProps, rootContainerElement) {
        var updatePayload = null;

        var lastProps;
        var nextProps;
        switch (tag) {
            case 'input':
                lastProps = $DOMFiberInput.getHostProps(domElement, lastRawProps);
                nextProps = $DOMFiberInput.getHostProps(domElement, nextRawProps);
                updatePayload = [];
                break;
            case 'option':
                lastProps = $DOMFiberOption.getHostProps(domElement, lastRawProps);
                nextProps = $DOMFiberOption.getHostProps(domElement, nextRawProps);
                updatePayload = [];
                break;
            case 'select':
                lastProps = $DOMFiberSelect.getHostProps(domElement, lastRawProps);
                nextProps = $DOMFiberSelect.getHostProps(domElement, nextRawProps);
                updatePayload = [];
                break;
            default:
                lastProps = lastRawProps;
                nextProps = nextRawProps;
                if (typeof lastProps.onClick !== 'function' && typeof nextProps.onClick === 'function') {
                    // TODO: This cast may not be sound for SVG, MathML or custom elements.
                    trapClickOnNonInteractiveElement(domElement);
                }
                break;
        }


        var propKey;
        var styleName;
        var styleUpdates = null;
        for (propKey in lastProps) {
            if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey) || lastProps[propKey] == null) {
                continue;
            }
            if (propKey === STYLE) {
                var lastStyle = lastProps[propKey];
                for (styleName in lastStyle) {
                    if (lastStyle.hasOwnProperty(styleName)) {
                        if (!styleUpdates) {
                            styleUpdates = {};
                        }
                        styleUpdates[styleName] = '';
                    }
                }
            } else if (propKey === DANGEROUSLY_SET_INNER_HTML || propKey === CHILDREN) {
                // Noop. This is handled by the clear text mechanism.
            } else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING) {
                // Noop
            } else if (registrationNameModules.hasOwnProperty(propKey)) {
                // This is a special case. If any listener updates we need to ensure
                // that the "current" fiber pointer gets updated so we need a commit
                // to update this element.
                if (!updatePayload) {
                    updatePayload = [];
                }
            } else {
                // For all other deleted properties we add it to the queue. We use
                // the whitelist in the commit phase instead.
                (updatePayload = updatePayload || []).push(propKey, null);
            }
        }
        for (propKey in nextProps) {
            var nextProp = nextProps[propKey];
            var lastProp = lastProps != null ? lastProps[propKey] : undefined;
            if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp || nextProp == null && lastProp == null) {
                continue;
            }
            if (propKey === STYLE) {
                {
                    if (nextProp) {
                        // Freeze the next style object so that we can assume it won't be
                        // mutated. We have already warned for this in the past.
                        Object.freeze(nextProp);
                    }
                }
                if (lastProp) {
                    // Unset styles on `lastProp` but not on `nextProp`.
                    for (styleName in lastProp) {
                        if (lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
                            if (!styleUpdates) {
                                styleUpdates = {};
                            }
                            styleUpdates[styleName] = '';
                        }
                    }
                    // Update styles that changed since `lastProp`.
                    for (styleName in nextProp) {
                        if (nextProp.hasOwnProperty(styleName) && lastProp[styleName] !== nextProp[styleName]) {
                            if (!styleUpdates) {
                                styleUpdates = {};
                            }
                            styleUpdates[styleName] = nextProp[styleName];
                        }
                    }
                } else {
                    // Relies on `updateStylesByID` not mutating `styleUpdates`.
                    if (!styleUpdates) {
                        if (!updatePayload) {
                            updatePayload = [];
                        }
                        updatePayload.push(propKey, styleUpdates);
                    }
                    styleUpdates = nextProp;
                }
            } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
                var nextHtml = nextProp ? nextProp[HTML] : undefined;
                var lastHtml = lastProp ? lastProp[HTML] : undefined;
                if (nextHtml != null) {
                    if (lastHtml !== nextHtml) {
                        (updatePayload = updatePayload || []).push(propKey, '' + nextHtml);
                    }
                } else {
                    // TODO: It might be too late to clear this if we have children
                    // inserted already.
                }
            } else if (propKey === CHILDREN) {
                if (lastProp !== nextProp && (typeof nextProp === 'string' || typeof nextProp === 'number')) {
                    (updatePayload = updatePayload || []).push(propKey, '' + nextProp);
                }
            } else if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING) {
                // Noop
            } else if (registrationNameModules.hasOwnProperty(propKey)) {
                if (nextProp != null) {

                    ensureListeningTo(rootContainerElement, propKey);
                }
                if (!updatePayload && lastProp !== nextProp) {
                    // This is a special case. If any listener updates we need to ensure
                    // that the "current" props pointer gets updated so we need a commit
                    // to update this element.
                    updatePayload = [];
                }
            } else {
                // For any other property we always add it to the queue and then we
                // filter it out using the whitelist during the commit.
                (updatePayload = updatePayload || []).push(propKey, nextProp);
            }
        }
        if (styleUpdates) {
            (updatePayload = updatePayload || []).push(STYLE, styleUpdates);
        }
        return updatePayload;
    },


    // Apply the diff.
    updateProperties: function (domElement, updatePayload, tag, lastRawProps, nextRawProps) {

        // Apply the diff.
        updateDOMProperties(domElement, updatePayload);

        // TODO: Ensure that an update gets scheduled if any of the special props
        // changed.
        switch (tag) {
            case 'input':
                // Update the wrapper around inputs *after* updating props. This has to
                // happen after `updateDOMProperties`. Otherwise HTML5 input validations
                // raise warnings and prevent the new value from being assigned.
                $DOMFiberInput.updateWrapper(domElement, nextRawProps);

                // We also check that we haven't missed a value update, such as a
                // Radio group shifting the checked value to another named radio input.
                inputValueTracking_1.updateValueIfChanged(domElement);
                break;
            case 'select':
                // <select> value update needs to occur after <option> children
                // reconciliation
                $DOMFiberSelect.postUpdateWrapper(domElement, nextRawProps);
                break;
        }
    },
    diffHydratedProperties: function (domElement, tag, rawProps, parentNamespace, rootContainerElement) {
        switch (tag) {
            case 'iframe':
            case 'object':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topLoad', 'load', domElement);
                break;
            case 'video':
            case 'audio':
                // Create listener for each media event
                for (var event in mediaEvents) {
                    if (mediaEvents.hasOwnProperty(event)) {
                        UmdBrowserEventEmitter_1.trapBubbledEvent(event, mediaEvents[event], domElement);
                    }
                }
                break;
            case 'source':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topError', 'error', domElement);
                break;
            case 'img':
            case 'image':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topError', 'error', domElement);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topLoad', 'load', domElement);
                break;
            case 'form':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topReset', 'reset', domElement);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topSubmit', 'submit', domElement);
                break;
            case 'details':
                UmdBrowserEventEmitter_1.trapBubbledEvent('topToggle', 'toggle', domElement);
                break;
            case 'input':
                $DOMFiberInput.initWrapperState(domElement, rawProps);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topInvalid', 'invalid', domElement);
                // For controlled components we always need to ensure we're listening
                // to onChange. Even if there is no listener.
                ensureListeningTo(rootContainerElement, 'onChange');
                break;
            case 'option':
                $DOMFiberOption.validateProps(domElement, rawProps);
                break;
            case 'select':
                $DOMFiberSelect.initWrapperState(domElement, rawProps);
                UmdBrowserEventEmitter_1.trapBubbledEvent('topInvalid', 'invalid', domElement);
                // For controlled components we always need to ensure we're listening
                // to onChange. Even if there is no listener.
                ensureListeningTo(rootContainerElement, 'onChange');
                break;
        }


        {
            var extraAttributeNames = new Set();
            var attributes = domElement.attributes;
            for (var i = 0; i < attributes.length; i++) {
                var name = attributes[i].name.toLowerCase();
                switch (name) {
                    // Built-in SSR attribute is whitelisted
                    case 'data-umdroot':
                        break;
                    // Controlled attributes are not validated
                    // TODO: Only ignore them on controlled tags.
                    case 'value':
                        break;
                    case 'checked':
                        break;
                    case 'selected':
                        break;
                    default:
                        // Intentionally use the original name.
                        // See discussion in https://github.com/facebook/umd/pull/10676.
                        extraAttributeNames.add(attributes[i].name);
                }
            }
        }

        var updatePayload = null;
        for (var propKey in rawProps) {
            if (!rawProps.hasOwnProperty(propKey)) {
                continue;
            }
            var nextProp = rawProps[propKey];
            if (propKey === CHILDREN) {
                // For text content children we compare against textContent. This
                // might match additional HTML that is hidden when we read it using
                // textContent. E.g. "foo" will match "f<span>oo</span>" but that still
                // satisfies our requirement. Our requirement is not to produce perfect
                // HTML and attributes. Ideally we should preserve structure but it's
                // ok not to if the visible content is still enough to indicate what
                // even listeners these nodes might be wired up to.
                // TODO: Warn if there is more than a single textNode as a child.
                // TODO: Should we use domElement.firstChild.nodeValue to compare?
                if (typeof nextProp === 'string') {
                    if (domElement.textContent !== nextProp) {
                        {
                            warnForTextDifference(domElement.textContent, nextProp);
                        }
                        updatePayload = [CHILDREN, nextProp];
                    }
                } else if (typeof nextProp === 'number') {
                    if (domElement.textContent !== '' + nextProp) {
                        {
                            warnForTextDifference(domElement.textContent, nextProp);
                        }
                        updatePayload = [CHILDREN, '' + nextProp];
                    }
                }
            } else if (registrationNameModules.hasOwnProperty(propKey)) {
                if (nextProp != null) {

                    ensureListeningTo(rootContainerElement, propKey);
                }
            } else {
                // Validate that the properties correspond to their expected values.
                var serverValue;
                var propertyInfo;
                if (propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
                    // Controlled attributes are not validated
                    // TODO: Only ignore them on controlled tags.
                    propKey === 'value' || propKey === 'checked' || propKey === 'selected') {
                    // Noop
                } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
                    var rawHtml = nextProp ? nextProp[HTML] || '' : '';
                    var serverHTML = domElement.innerHTML;
                    var expectedHTML = normalizeHTML(domElement, rawHtml);
                    if (expectedHTML !== serverHTML) {
                        warnForPropDifference(propKey, serverHTML, expectedHTML);
                    }
                } else if (propKey === STYLE) {
                    // $FlowFixMe - Should be inferred as not undefined.
                    extraAttributeNames['delete'](propKey);
                    var expectedStyle = CSSPropertyOperations.createDangerousStringForStyles(nextProp);
                    serverValue = domElement.getAttribute('style');
                    if (expectedStyle !== serverValue) {
                        warnForPropDifference(propKey, serverValue, expectedStyle);
                    }
                } else if (DOMProperty.shouldSetAttribute(propKey, nextProp)) {
                    if (propertyInfo = DOMProperty.getPropertyInfo(propKey)) {
                        // $FlowFixMe - Should be inferred as not undefined.
                        extraAttributeNames['delete'](propertyInfo.attributeName);
                        serverValue = DOMPropertyOperations_1.getValueForProperty(domElement, propKey, nextProp);
                    } else {
                        var ownNamespace = parentNamespace;
                        if (ownNamespace === HTML_NAMESPACE$1) {
                            ownNamespace = getIntrinsicNamespace$1(tag);
                        }
                        if (ownNamespace === HTML_NAMESPACE$1) {
                            // $FlowFixMe - Should be inferred as not undefined.
                            extraAttributeNames['delete'](propKey.toLowerCase());
                        } else {
                            // $FlowFixMe - Should be inferred as not undefined.
                            extraAttributeNames['delete'](propKey);
                        }
                        serverValue = DOMPropertyOperations_1.getValueForAttribute(domElement, propKey, nextProp);
                    }

                    if (nextProp !== serverValue) {
                        warnForPropDifference(propKey, serverValue, nextProp);
                    }
                }
            }
        }

        {
            // $FlowFixMe - Should be inferred as not undefined.
            if (extraAttributeNames.size > 0) {
                // $FlowFixMe - Should be inferred as not undefined.
                warnForExtraAttributes(extraAttributeNames);
            }
        }

        switch (tag) {
            case 'input':
                // TODO: Make sure we check if this is still unmounted or do any clean
                // up necessary since we never stop tracking anymore.
                inputValueTracking_1.track(domElement);
                $DOMFiberInput.postMountWrapper(domElement, rawProps);
                break;

            case 'select':
            case 'option':
                // For input and textarea we current always set the value property at
                // post mount to force it to diverge from attributes. However, for
                // option and select we don't quite do the same thing and select
                // is not resilient to the DOM state changing so we don't do that here.
                // TODO: Consider not doing this for input and textarea.
                break;
            default:
                if (typeof rawProps.onClick === 'function') {
                    // TODO: This cast may not be sound for SVG, MathML or custom elements.
                    trapClickOnNonInteractiveElement(domElement);
                }
                break;
        }

        return updatePayload;
    },
    diffHydratedText: function (textNode, text) {
        var isDifferent = textNode.nodeValue !== text;
        {
            if (isDifferent) {
                warnForTextDifference(textNode.nodeValue, text);
            }
        }
        return isDifferent;
    },
    warnForDeletedHydratableElement: function (parentNode, child) {
        {
            if (didWarnInvalidHydration) {
                return;
            }
            didWarnInvalidHydration = true;
        }
    },
    warnForDeletedHydratableText: function (parentNode, child) {
        {
            if (didWarnInvalidHydration) {
                return;
            }
            didWarnInvalidHydration = true;
        }
    },
    warnForInsertedHydratedElement: function (parentNode, tag, props) {
        {
            if (didWarnInvalidHydration) {
                return;
            }
            didWarnInvalidHydration = true;
        }
    },
    warnForInsertedHydratedText: function (parentNode, text) {
        {
            if (text === '') {
                // We expect to insert empty text nodes since they're not represented in
                // the HTML.
                // TODO: Remove this special case if we can just avoid inserting empty
                // text nodes.
                return;
            }
            if (didWarnInvalidHydration) {
                return;
            }
            didWarnInvalidHydration = true;
        }
    },
    restoreControlledState: function (domElement, tag, props) {
        switch (tag) {
            case 'input':
                $DOMFiberInput.restoreControlledState(domElement, props);
                return;
            case 'select':
                $DOMFiberSelect.restoreControlledState(domElement, props);
                return;
        }
    }
};

var $DOMFiberComponent_1 = $DOMFiberComponent;

// This is a built-in polyfill for requestIdleCallback. It works by scheduling
// a requestAnimationFrame, storing the time for the start of the frame, then
// scheduling a postMessage which gets scheduled after paint. Within the
// postMessage handler do as much work as possible until time + frame rate.
// By separating the idle call into a separate event tick we ensure that
// layout, paint and other browser work is counted against the available time.
// The frame rate is dynamically adjusted.



// TODO: There's no way to cancel, because Fiber doesn't atm.
var rIC = void 0;

if (!ExecutionEnvironment.canUseDOM) {
    rIC = function (frameCallback) {
        setTimeout(function () {
            frameCallback({
                timeRemaining: function () {
                    return Infinity;
                }
            });
        });
        return 0;
    };
} else if (typeof requestIdleCallback !== 'function') {
    // Polyfill requestIdleCallback.

    var scheduledRAFCallback = null;
    var scheduledRICCallback = null;

    var isIdleScheduled = false;
    var isAnimationFrameScheduled = false;

    var frameDeadline = 0;
    // We start out assuming that we run at 30fps but then the heuristic tracking
    // will adjust this value to a faster fps if we get more frequent animation
    // frames.
    var previousFrameTime = 33;
    var activeFrameTime = 33;

    var frameDeadlineObject = {
        timeRemaining: typeof performance === 'object' && typeof performance.now === 'function' ? function () {
            // We assume that if we have a performance timer that the rAF callback
            // gets a performance timer value. Not sure if this is always true.
            return frameDeadline - performance.now();
        } : function () {
            // As a fallback we use Date.now.
            return frameDeadline - Date.now();
        }
    };

    // We use the postMessage trick to defer idle work until after the repaint.
    var messageKey = "__umdIdleCallback$" + Math.random().toString(36).slice(2);
    var idleTick = function (event) {
        if (event.source !== window || event.data !== messageKey) {
            return;
        }
        isIdleScheduled = false;
        var callback = scheduledRICCallback;
        scheduledRICCallback = null;
        if (callback !== null) {
            callback(frameDeadlineObject);
        }
    };
    // Assumes that we have addEventListener in this environment. Might need
    // something better for old IE.
    window.addEventListener('message', idleTick, false);

    var animationTick = function (rafTime) {
        isAnimationFrameScheduled = false;
        var nextFrameTime = rafTime - frameDeadline + activeFrameTime;
        if (nextFrameTime < activeFrameTime && previousFrameTime < activeFrameTime) {
            if (nextFrameTime < 8) {
                // Defensive coding. We don't support higher frame rates than 120hz.
                // If we get lower than that, it is probably a bug.
                nextFrameTime = 8;
            }
            // If one frame goes long, then the next one can be short to catch up.
            // If two frames are short in a row, then that's an indication that we
            // actually have a higher frame rate than what we're currently optimizing.
            // We adjust our heuristic dynamically accordingly. For example, if we're
            // running on 120hz display or 90hz VR display.
            // Take the max of the two in case one of them was an anomaly due to
            // missed frame deadlines.
            activeFrameTime = nextFrameTime < previousFrameTime ? previousFrameTime : nextFrameTime;
        } else {
            previousFrameTime = nextFrameTime;
        }
        frameDeadline = rafTime + activeFrameTime;
        if (!isIdleScheduled) {
            isIdleScheduled = true;
            window.postMessage(messageKey, '*');
        }
        var callback = scheduledRAFCallback;
        scheduledRAFCallback = null;
        if (callback !== null) {
            callback(rafTime);
        }
    };

    rIC = function (callback) {
        // This assumes that we only schedule one callback at a time because that's
        // how Fiber uses it.
        scheduledRICCallback = callback;
        if (!isAnimationFrameScheduled) {
            // If rAF didn't already schedule one, we need to schedule a frame.
            // TODO: If this rAF doesn't materialize because the browser throttles, we
            // might want to still have setTimeout trigger rIC as a backup to ensure
            // that we keep performing work.
            isAnimationFrameScheduled = true;
            requestAnimationFrame(animationTick);
        }
        return 0;
    };
} else {
    rIC = requestIdleCallback;
}

var rIC_1 = rIC;

var UmdDOMFrameScheduling = {
    rIC: rIC_1
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdFeatureFlags
 * 
 */

var UmdFeatureFlags = {
    enableAsyncSubtreeAPI: true
};

var UmdFeatureFlags_1 = UmdFeatureFlags;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdPriorityLevel
 * 
 */

var UmdPriorityLevel = {
    NoWork: 0, // No work is pending.
    SynchronousPriority: 1, // For controlled text inputs. Synchronous side-effects.
    TaskPriority: 2, // Completes at the end of the current tick.
    HighPriority: 3, // Interaction that needs to complete pretty soon to feel responsive.
    LowPriority: 4, // Data fetching, or result from updating stores.
    OffscreenPriority: 5
};

var CallbackEffect = UmdTypeOfSideEffect.Callback;

var NoWork = UmdPriorityLevel.NoWork;
var SynchronousPriority = UmdPriorityLevel.SynchronousPriority;
var TaskPriority = UmdPriorityLevel.TaskPriority;

var ClassComponent$2 = UmdTypeOfWork.ClassComponent;
var HostRoot$2 = UmdTypeOfWork.HostRoot;



// Callbacks are not validated until invocation


// Singly linked-list of updates. When an update is scheduled, it is added to
// the queue of the current fiber and the work-in-progress fiber. The two queues
// are separate but they share a persistent structure.
//
// During reconciliation, updates are removed from the work-in-progress fiber,
// but they remain on the current fiber. That ensures that if a work-in-progress
// is aborted, the aborted updates are recovered by cloning from current.
//
// The work-in-progress queue is always a subset of the current queue.
//
// When the tree is committed, the work-in-progress becomes the current.


var _queue1 = void 0;
var _queue2 = void 0;

function comparePriority(a, b) {
    // When comparing update priorities, treat sync and Task work as equal.
    // TODO: Could we avoid the need for this by always coercing sync priority
    // to Task when scheduling an update?
    if ((a === TaskPriority || a === SynchronousPriority) && (b === TaskPriority || b === SynchronousPriority)) {
        return 0;
    }
    if (a === NoWork && b !== NoWork) {
        return -255;
    }
    if (a !== NoWork && b === NoWork) {
        return 255;
    }
    return a - b;
}

function createUpdateQueue() {
    var queue = {
        first: null,
        last: null,
        hasForceUpdate: false,
        callbackList: null
    };
    {
        queue.isProcessing = false;
    }
    return queue;
}

function cloneUpdate(update) {
    return {
        priorityLevel: update.priorityLevel,
        partialState: update.partialState,
        callback: update.callback,
        isReplace: update.isReplace,
        isForced: update.isForced,
        isTopLevelUnmount: update.isTopLevelUnmount,
        next: null
    };
}

function insertUpdateIntoQueue(queue, update, insertAfter, insertBefore) {
    if (insertAfter !== null) {
        insertAfter.next = update;
    } else {
        // This is the first item in the queue.
        update.next = queue.first;
        queue.first = update;
    }

    if (insertBefore !== null) {
        update.next = insertBefore;
    } else {
        // This is the last item in the queue.
        queue.last = update;
    }
}

// Returns the update after which the incoming update should be inserted into
// the queue, or null if it should be inserted at beginning.
function findInsertionPosition(queue, update) {
    var priorityLevel = update.priorityLevel;
    var insertAfter = null;
    var insertBefore = null;
    if (queue.last !== null && comparePriority(queue.last.priorityLevel, priorityLevel) <= 0) {
        // Fast path for the common case where the update should be inserted at
        // the end of the queue.
        insertAfter = queue.last;
    } else {
        insertBefore = queue.first;
        while (insertBefore !== null && comparePriority(insertBefore.priorityLevel, priorityLevel) <= 0) {
            insertAfter = insertBefore;
            insertBefore = insertBefore.next;
        }
    }
    return insertAfter;
}

function ensureUpdateQueues(fiber) {
    var alternateFiber = fiber.alternate;

    var queue1 = fiber.updateQueue;
    if (queue1 === null) {
        queue1 = fiber.updateQueue = createUpdateQueue();
    }

    var queue2 = void 0;
    if (alternateFiber !== null) {
        queue2 = alternateFiber.updateQueue;
        if (queue2 === null) {
            queue2 = alternateFiber.updateQueue = createUpdateQueue();
        }
    } else {
        queue2 = null;
    }

    _queue1 = queue1;
    // Return null if there is no alternate queue, or if its queue is the same.
    _queue2 = queue2 !== queue1 ? queue2 : null;
}

function insertUpdate(fiber, update) {
    // We'll have at least one and at most two distinct update queues.
    ensureUpdateQueues(fiber);
    var queue1 = _queue1;
    var queue2 = _queue2;

    // Find the insertion position in the first queue.
    var insertAfter1 = findInsertionPosition(queue1, update);
    var insertBefore1 = insertAfter1 !== null ? insertAfter1.next : queue1.first;

    if (queue2 === null) {
        // If there's no alternate queue, there's nothing else to do but insert.
        insertUpdateIntoQueue(queue1, update, insertAfter1, insertBefore1);
        return null;
    }

    // If there is an alternate queue, find the insertion position.
    var insertAfter2 = findInsertionPosition(queue2, update);
    var insertBefore2 = insertAfter2 !== null ? insertAfter2.next : queue2.first;

    // Now we can insert into the first queue. This must come after finding both
    // insertion positions because it mutates the list.
    insertUpdateIntoQueue(queue1, update, insertAfter1, insertBefore1);

    // See if the insertion positions are equal. Be careful to only compare
    // non-null values.
    if (insertBefore1 === insertBefore2 && insertBefore1 !== null || insertAfter1 === insertAfter2 && insertAfter1 !== null) {
        // The insertion positions are the same, so when we inserted into the first
        // queue, it also inserted into the alternate. All we need to do is update
        // the alternate queue's `first` and `last` pointers, in case they
        // have changed.
        if (insertAfter2 === null) {
            queue2.first = update;
        }
        if (insertBefore2 === null) {
            queue2.last = null;
        }
        return null;
    } else {
        // The insertion positions are different, so we need to clone the update and
        // insert the clone into the alternate queue.
        var update2 = cloneUpdate(update);
        insertUpdateIntoQueue(queue2, update2, insertAfter2, insertBefore2);
        return update2;
    }
}

function addUpdate(fiber, partialState, callback, priorityLevel) {
    var update = {
        priorityLevel: priorityLevel,
        partialState: partialState,
        callback: callback,
        isReplace: false,
        isForced: false,
        isTopLevelUnmount: false,
        next: null
    };
    insertUpdate(fiber, update);
}
var addUpdate_1 = addUpdate;

function addReplaceUpdate(fiber, state, callback, priorityLevel) {
    var update = {
        priorityLevel: priorityLevel,
        partialState: state,
        callback: callback,
        isReplace: true,
        isForced: false,
        isTopLevelUnmount: false,
        next: null
    };
    insertUpdate(fiber, update);
}
var addReplaceUpdate_1 = addReplaceUpdate;

function addForceUpdate(fiber, callback, priorityLevel) {
    var update = {
        priorityLevel: priorityLevel,
        partialState: null,
        callback: callback,
        isReplace: false,
        isForced: true,
        isTopLevelUnmount: false,
        next: null
    };
    insertUpdate(fiber, update);
}
var addForceUpdate_1 = addForceUpdate;

function getUpdatePriority(fiber) {
    var updateQueue = fiber.updateQueue;
    if (updateQueue === null) {
        return NoWork;
    }
    if (fiber.tag !== ClassComponent$2 && fiber.tag !== HostRoot$2) {
        return NoWork;
    }
    return updateQueue.first !== null ? updateQueue.first.priorityLevel : NoWork;
}
var getUpdatePriority_1 = getUpdatePriority;

function addTopLevelUpdate$1(fiber, partialState, callback, priorityLevel) {
    var isTopLevelUnmount = partialState.element === null;

    var update = {
        priorityLevel: priorityLevel,
        partialState: partialState,
        callback: callback,
        isReplace: false,
        isForced: false,
        isTopLevelUnmount: isTopLevelUnmount,
        next: null
    };
    var update2 = insertUpdate(fiber, update);

    if (isTopLevelUnmount) {
        // TODO: Redesign the top-level mount/update/unmount API to avoid this
        // special case.
        var queue1 = _queue1;
        var queue2 = _queue2;

        // Drop all updates that are lower-priority, so that the tree is not
        // remounted. We need to do this for both queues.
        if (queue1 !== null && update.next !== null) {
            update.next = null;
            queue1.last = update;
        }
        if (queue2 !== null && update2 !== null && update2.next !== null) {
            update2.next = null;
            queue2.last = update;
        }
    }
}
var addTopLevelUpdate_1 = addTopLevelUpdate$1;

function getStateFromUpdate(update, instance, prevState, props) {
    var partialState = update.partialState;
    if (typeof partialState === 'function') {
        var updateFn = partialState;
        return updateFn.call(instance, prevState, props);
    } else {
        return partialState;
    }
}

function beginUpdateQueue(current, workInProgress, queue, instance, prevState, props, priorityLevel) {
    if (current !== null && current.updateQueue === queue) {
        // We need to create a work-in-progress queue, by cloning the current queue.
        var currentQueue = queue;
        queue = workInProgress.updateQueue = {
            first: currentQueue.first,
            last: currentQueue.last,
            // These fields are no longer valid because they were already committed.
            // Reset them.
            callbackList: null,
            hasForceUpdate: false
        };
    }

    {
        // Set this flag so we can warn if setState is called inside the update
        // function of another setState.
        queue.isProcessing = true;
    }

    // Calculate these using the the existing values as a base.
    var callbackList = queue.callbackList;
    var hasForceUpdate = queue.hasForceUpdate;

    // Applies updates with matching priority to the previous state to create
    // a new state object.
    var state = prevState;
    var dontMutatePrevState = true;
    var update = queue.first;
    while (update !== null && comparePriority(update.priorityLevel, priorityLevel) <= 0) {
        // Remove each update from the queue right before it is processed. That way
        // if setState is called from inside an updater function, the new update
        // will be inserted in the correct position.
        queue.first = update.next;
        if (queue.first === null) {
            queue.last = null;
        }

        var _partialState = void 0;
        if (update.isReplace) {
            state = getStateFromUpdate(update, instance, state, props);
            dontMutatePrevState = true;
        } else {
            _partialState = getStateFromUpdate(update, instance, state, props);
            if (_partialState) {
                if (dontMutatePrevState) {
                    state = _assign({}, state, _partialState);
                } else {
                    state = _assign(state, _partialState);
                }
                dontMutatePrevState = false;
            }
        }
        if (update.isForced) {
            hasForceUpdate = true;
        }
        // Second condition ignores top-level unmount callbacks if they are not the
        // last update in the queue, since a subsequent update will cause a remount.
        if (update.callback !== null && !(update.isTopLevelUnmount && update.next !== null)) {
            callbackList = callbackList !== null ? callbackList : [];
            callbackList.push(update.callback);
            workInProgress.effectTag |= CallbackEffect;
        }
        update = update.next;
    }

    queue.callbackList = callbackList;
    queue.hasForceUpdate = hasForceUpdate;

    if (queue.first === null && callbackList === null && !hasForceUpdate) {
        // The queue is empty and there are no callbacks. We can reset it.
        workInProgress.updateQueue = null;
    }

    {
        // No longer processing.
        queue.isProcessing = false;
    }

    return state;
}
var beginUpdateQueue_1 = beginUpdateQueue;

function commitCallbacks(finishedWork, queue, context) {
    var callbackList = queue.callbackList;
    if (callbackList === null) {
        return;
    }

    // Set the list to null to make sure they don't get called more than once.
    queue.callbackList = null;

    for (var i = 0; i < callbackList.length; i++) {
        var _callback = callbackList[i];
        _callback.call(context);
    }
}
var commitCallbacks_1 = commitCallbacks;

var UmdFiberUpdateQueue = {
    addUpdate: addUpdate_1,
    addReplaceUpdate: addReplaceUpdate_1,
    addForceUpdate: addForceUpdate_1,
    getUpdatePriority: getUpdatePriority_1,
    addTopLevelUpdate: addTopLevelUpdate_1,
    beginUpdateQueue: beginUpdateQueue_1,
    commitCallbacks: commitCallbacks_1
};


var valueStack = [];

{
    var fiberStack = [];
}

var index = -1;

var createCursor$1 = function (defaultValue) {
    return {
        current: defaultValue
    };
};

var isEmpty = function () {
    return index === -1;
};

var pop$1 = function (cursor, fiber) {
    if (index < 0) {


        return;
    }



    cursor.current = valueStack[index];

    valueStack[index] = null;

    {
        fiberStack[index] = null;
    }

    index--;
};

var push$1 = function (cursor, value, fiber) {
    index++;

    valueStack[index] = cursor.current;

    {
        fiberStack[index] = fiber;
    }

    cursor.current = value;
};

var reset = function () {
    while (index > -1) {
        valueStack[index] = null;

        {
            fiberStack[index] = null;
        }

        index--;
    }
};

var UmdFiberStack = {
    createCursor: createCursor$1,
    isEmpty: isEmpty,
    pop: pop$1,
    push: push$1,
    reset: reset
};

// Trust the developer to only use this with a true check
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdDebugFiberPerf
 * 
 */

var UmdDebugFiberPerf = null;

{
    var _require$8 = UmdTypeOfWork,
        HostRoot$4 = _require$8.HostRoot,
        HostComponent$4 = _require$8.HostComponent,
        HostText$2 = _require$8.HostText,
        HostPortal$1 = _require$8.HostPortal,
        YieldComponent = _require$8.YieldComponent,
        Fragment = _require$8.Fragment;

    var getComponentName$5 = getComponentName_1;

    // Prefix measurements so that it's possible to filter them.
    // Longer prefixes are hard to read in DevTools.
    var umdEmoji = '\u269B';
    var warningEmoji = '\u26D4';
    var supportsUserTiming = typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.clearMarks === 'function' && typeof performance.measure === 'function' && typeof performance.clearMeasures === 'function';

    // Keep track of current fiber so that we know the path to unwind on pause.
    // TODO: this looks the same as nextUnitOfWork in scheduler. Can we unify them?
    var currentFiber = null;
    // If we're in the middle of user code, which fiber and method is it?
    // Reusing `currentFiber` would be confusing for this because user code fiber
    // can change during commit phase too, but we don't need to unwind it (since
    // lifecycles in the commit phase don't resemble a tree).
    var currentPhase = null;
    var currentPhaseFiber = null;
    // Did lifecycle hook schedule an update? This is often a performance problem,
    // so we will keep track of it, and include it in the report.
    // Track commits caused by cascading updates.
    var isCommitting = false;
    var hasScheduledUpdateInCurrentCommit = false;
    var hasScheduledUpdateInCurrentPhase = false;
    var commitCountInCurrentWorkLoop = 0;
    var effectCountInCurrentCommit = 0;
    // During commits, we only show a measurement once per method name
    // to avoid stretch the commit phase with measurement overhead.
    var labelsInCurrentCommit = new Set();

    var formatMarkName = function (markName) {
        return umdEmoji + ' ' + markName;
    };

    var formatLabel = function (label, warning) {
        var prefix = warning ? warningEmoji + ' ' : umdEmoji + ' ';
        var suffix = warning ? ' Warning: ' + warning : '';
        return '' + prefix + label + suffix;
    };

    var beginMark = function (markName) {
        performance.mark(formatMarkName(markName));
    };

    var clearMark = function (markName) {
        performance.clearMarks(formatMarkName(markName));
    };

    var endMark = function (label, markName, warning) {
        var formattedMarkName = formatMarkName(markName);
        var formattedLabel = formatLabel(label, warning);
        try {
            performance.measure(formattedLabel, formattedMarkName);
        } catch (err) { }
        // If previous mark was missing for some reason, this will throw.
        // This could only happen if Umd crashed in an unexpected place earlier.
        // Don't pile on with more errors.

        // Clear marks immediately to avoid growing buffer.
        performance.clearMarks(formattedMarkName);
        performance.clearMeasures(formattedLabel);
    };

    var getFiberMarkName = function (label, debugID) {
        return label + ' (#' + debugID + ')';
    };

    var getFiberLabel = function (componentName, isMounted, phase) {
        if (phase === null) {
            // These are composite component total time measurements.
            return componentName + ' [' + (isMounted ? 'update' : 'mount') + ']';
        } else {
            // Composite component methods.
            return componentName + '.' + phase;
        }
    };

    var beginFiberMark = function (fiber, phase) {
        var componentName = getComponentName$5(fiber) || 'Unknown';
        var debugID = fiber._debugID;
        var isMounted = fiber.alternate !== null;
        var label = getFiberLabel(componentName, isMounted, phase);

        if (isCommitting && labelsInCurrentCommit.has(label)) {
            // During the commit phase, we don't show duplicate labels because
            // there is a fixed overhead for every measurement, and we don't
            // want to stretch the commit phase beyond necessary.
            return false;
        }
        labelsInCurrentCommit.add(label);

        var markName = getFiberMarkName(label, debugID);
        beginMark(markName);
        return true;
    };

    var clearFiberMark = function (fiber, phase) {
        var componentName = getComponentName$5(fiber) || 'Unknown';
        var debugID = fiber._debugID;
        var isMounted = fiber.alternate !== null;
        var label = getFiberLabel(componentName, isMounted, phase);
        var markName = getFiberMarkName(label, debugID);
        clearMark(markName);
    };

    var endFiberMark = function (fiber, phase, warning) {
        var componentName = getComponentName$5(fiber) || 'Unknown';
        var debugID = fiber._debugID;
        var isMounted = fiber.alternate !== null;
        var label = getFiberLabel(componentName, isMounted, phase);
        var markName = getFiberMarkName(label, debugID);
        endMark(label, markName, warning);
    };

    var shouldIgnoreFiber = function (fiber) {
        // Host components should be skipped in the timeline.
        // We could check typeof fiber.type, but does this work with RN?
        switch (fiber.tag) {
            case HostRoot$4:
            case HostComponent$4:
            case HostText$2:
            case HostPortal$1:
            case YieldComponent:
            case Fragment:
                return true;
            default:
                return false;
        }
    };

    var clearPendingPhaseMeasurement = function () {
        if (currentPhase !== null && currentPhaseFiber !== null) {
            clearFiberMark(currentPhaseFiber, currentPhase);
        }
        currentPhaseFiber = null;
        currentPhase = null;
        hasScheduledUpdateInCurrentPhase = false;
    };

    var pauseTimers = function () {
        // Stops all currently active measurements so that they can be resumed
        // if we continue in a later deferred loop from the same unit of work.
        var fiber = currentFiber;
        while (fiber) {
            if (fiber._debugIsCurrentlyTiming) {
                endFiberMark(fiber, null, null);
            }
            fiber = fiber['return'];
        }
    };

    var resumeTimersRecursively = function (fiber) {
        if (fiber['return'] !== null) {
            resumeTimersRecursively(fiber['return']);
        }
        if (fiber._debugIsCurrentlyTiming) {
            beginFiberMark(fiber, null);
        }
    };

    var resumeTimers = function () {
        // Resumes all measurements that were active during the last deferred loop.
        if (currentFiber !== null) {
            resumeTimersRecursively(currentFiber);
        }
    };

    UmdDebugFiberPerf = {
        recordEffect: function () {
            effectCountInCurrentCommit++;
        },
        recordScheduleUpdate: function () {
            if (isCommitting) {
                hasScheduledUpdateInCurrentCommit = true;
            }
            if (currentPhase !== null && currentPhase !== 'componentWillMount' && currentPhase !== 'componentWillReceiveProps') {
                hasScheduledUpdateInCurrentPhase = true;
            }
        },
        startWorkTimer: function (fiber) {
            if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
                return;
            }
            // If we pause, this is the fiber to unwind from.
            currentFiber = fiber;
            if (!beginFiberMark(fiber, null)) {
                return;
            }
            fiber._debugIsCurrentlyTiming = true;
        },
        cancelWorkTimer: function (fiber) {
            if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
                return;
            }
            // Remember we shouldn't complete measurement for this fiber.
            // Otherwise flamechart will be deep even for small updates.
            fiber._debugIsCurrentlyTiming = false;
            clearFiberMark(fiber, null);
        },
        stopWorkTimer: function (fiber) {
            if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
                return;
            }
            // If we pause, its parent is the fiber to unwind from.
            currentFiber = fiber['return'];
            if (!fiber._debugIsCurrentlyTiming) {
                return;
            }
            fiber._debugIsCurrentlyTiming = false;
            endFiberMark(fiber, null, null);
        },
        stopFailedWorkTimer: function (fiber) {
            if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
                return;
            }
            // If we pause, its parent is the fiber to unwind from.
            currentFiber = fiber['return'];
            if (!fiber._debugIsCurrentlyTiming) {
                return;
            }
            fiber._debugIsCurrentlyTiming = false;
            var warning = 'An error was thrown inside this error boundary';
            endFiberMark(fiber, null, warning);
        },
        startPhaseTimer: function (fiber, phase) {
            if (!supportsUserTiming) {
                return;
            }
            clearPendingPhaseMeasurement();
            if (!beginFiberMark(fiber, phase)) {
                return;
            }
            currentPhaseFiber = fiber;
            currentPhase = phase;
        },
        stopPhaseTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            if (currentPhase !== null && currentPhaseFiber !== null) {
                var warning = hasScheduledUpdateInCurrentPhase ? 'Scheduled a cascading update' : null;
                endFiberMark(currentPhaseFiber, currentPhase, warning);
            }
            currentPhase = null;
            currentPhaseFiber = null;
        },
        startWorkLoopTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            commitCountInCurrentWorkLoop = 0;
            // This is top level call.
            // Any other measurements are performed within.
            beginMark('(Umd Tree Reconciliation)');
            // Resume any measurements that were in progress during the last loop.
            resumeTimers();
        },
        stopWorkLoopTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            var warning = commitCountInCurrentWorkLoop > 1 ? 'There were cascading updates' : null;
            commitCountInCurrentWorkLoop = 0;
            // Pause any measurements until the next loop.
            pauseTimers();
            endMark('(Umd Tree Reconciliation)', '(Umd Tree Reconciliation)', warning);
        },
        startCommitTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            isCommitting = true;
            hasScheduledUpdateInCurrentCommit = false;
            labelsInCurrentCommit.clear();
            beginMark('(Committing Changes)');
        },
        stopCommitTimer: function () {
            if (!supportsUserTiming) {
                return;
            }

            var warning = null;
            if (hasScheduledUpdateInCurrentCommit) {
                warning = 'Lifecycle hook scheduled a cascading update';
            } else if (commitCountInCurrentWorkLoop > 0) {
                warning = 'Caused by a cascading update in earlier commit';
            }
            hasScheduledUpdateInCurrentCommit = false;
            commitCountInCurrentWorkLoop++;
            isCommitting = false;
            labelsInCurrentCommit.clear();

            endMark('(Committing Changes)', '(Committing Changes)', warning);
        },
        startCommitHostEffectsTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            effectCountInCurrentCommit = 0;
            beginMark('(Committing Host Effects)');
        },
        stopCommitHostEffectsTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            var count = effectCountInCurrentCommit;
            effectCountInCurrentCommit = 0;
            endMark('(Committing Host Effects: ' + count + ' Total)', '(Committing Host Effects)', null);
        },
        startCommitLifeCyclesTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            effectCountInCurrentCommit = 0;
            beginMark('(Calling Lifecycle Methods)');
        },
        stopCommitLifeCyclesTimer: function () {
            if (!supportsUserTiming) {
                return;
            }
            var count = effectCountInCurrentCommit;
            effectCountInCurrentCommit = 0;
            endMark('(Calling Lifecycle Methods: ' + count + ' Total)', '(Calling Lifecycle Methods)', null);
        }
    };
}

var UmdDebugFiberPerf_1 = UmdDebugFiberPerf;

var isFiberMounted$1 = UmdFiberTreeReflection.isFiberMounted;

var ClassComponent$3 = UmdTypeOfWork.ClassComponent;
var HostRoot$3 = UmdTypeOfWork.HostRoot;

var createCursor = UmdFiberStack.createCursor;
var pop = UmdFiberStack.pop;
var push = UmdFiberStack.push;

{

    var UmdDebugCurrentFiber$2 = UmdDebugCurrentFiber_1;

    var _require4 = UmdDebugFiberPerf_1,
        startPhaseTimer = _require4.startPhaseTimer,
        stopPhaseTimer = _require4.stopPhaseTimer;

    var warnedAboutMissingGetChildContext = {};
}

// A cursor to the current merged context object on the stack.
var contextStackCursor = createCursor(emptyObject);
// A cursor to a boolean indicating whether the context has changed.
var didPerformWorkStackCursor = createCursor(false);
// Keep track of the previous context object that was on the stack.
// We use this to get access to the parent context after we have already
// pushed the next context provider, and now need to merge their contexts.
var previousContext = emptyObject;

function getUnmaskedContext(workInProgress) {
    var hasOwnContext = isContextProvider$1(workInProgress);
    if (hasOwnContext) {
        // If the fiber is a context provider itself, when we read its context
        // we have already pushed its own child context on the stack. A context
        // provider should not "see" its own child context. Therefore we read the
        // previous (parent) context instead for a context provider.
        return previousContext;
    }
    return contextStackCursor.current;
}
var getUnmaskedContext_1 = getUnmaskedContext;

function cacheContext(workInProgress, unmaskedContext, maskedContext) {
    var instance = workInProgress.stateNode;
    instance.__umdInternalMemoizedUnmaskedChildContext = unmaskedContext;
    instance.__umdInternalMemoizedMaskedChildContext = maskedContext;
}
var cacheContext_1 = cacheContext;

var getMaskedContext = function (workInProgress, unmaskedContext) {
    var type = workInProgress.type;
    var contextTypes = type.contextTypes;
    if (!contextTypes) {
        return emptyObject;
    }

    // Avoid recreating masked context unless unmasked context has changed.
    // Failing to do this will result in unnecessary calls to componentWillReceiveProps.
    // This may trigger infinite loops if componentWillReceiveProps calls setState.
    var instance = workInProgress.stateNode;
    if (instance && instance.__umdInternalMemoizedUnmaskedChildContext === unmaskedContext) {
        return instance.__umdInternalMemoizedMaskedChildContext;
    }

    var context = {};
    for (var key in contextTypes) {
        context[key] = unmaskedContext[key];
    }



    // Cache unmasked context so we can avoid recreating masked context unless necessary.
    // Context is created before the class component is instantiated so check for instance.
    if (instance) {
        cacheContext(workInProgress, unmaskedContext, context);
    }

    return context;
};

var hasContextChanged = function () {
    return didPerformWorkStackCursor.current;
};

function isContextConsumer(fiber) {
    return fiber.tag === ClassComponent$3 && fiber.type.contextTypes != null;
}
var isContextConsumer_1 = isContextConsumer;

function isContextProvider$1(fiber) {
    return fiber.tag === ClassComponent$3 && fiber.type.childContextTypes != null;
}
var isContextProvider_1 = isContextProvider$1;

function popContextProvider(fiber) {
    if (!isContextProvider$1(fiber)) {
        return;
    }

    pop(didPerformWorkStackCursor, fiber);
    pop(contextStackCursor, fiber);
}
var popContextProvider_1 = popContextProvider;

var popTopLevelContextObject = function (fiber) {
    pop(didPerformWorkStackCursor, fiber);
    pop(contextStackCursor, fiber);
};

var pushTopLevelContextObject = function (fiber, context, didChange) {

    push(contextStackCursor, context, fiber);
    push(didPerformWorkStackCursor, didChange, fiber);
};

function processChildContext$1(fiber, parentContext, isReconciling) {
    var instance = fiber.stateNode;
    var childContextTypes = fiber.type.childContextTypes;


    if (typeof instance.getChildContext !== 'function') {
        {
            var componentName = getComponentName_1(fiber) || 'Unknown';

            if (!warnedAboutMissingGetChildContext[componentName]) {
                warnedAboutMissingGetChildContext[componentName] = true;
            }
        }
        return parentContext;
    }

    var childContext = void 0;
    {
        UmdDebugCurrentFiber$2.setCurrentFiber(fiber, 'getChildContext');
        startPhaseTimer(fiber, 'getChildContext');
        childContext = instance.getChildContext();
        stopPhaseTimer();
        UmdDebugCurrentFiber$2.resetCurrentFiber();
    }
    for (var contextKey in childContext) {
        !(contextKey in childContextTypes) ? getComponentName_1(fiber) || 'Unknown' : void 0;
    }


    return _assign({}, parentContext, childContext);
}
var processChildContext_1 = processChildContext$1;

var pushContextProvider = function (workInProgress) {
    if (!isContextProvider$1(workInProgress)) {
        return false;
    }

    var instance = workInProgress.stateNode;
    // We push the context as early as possible to ensure stack integrity.
    // If the instance does not exist yet, we will push null at first,
    // and replace it on the stack later when invalidating the context.
    var memoizedMergedChildContext = instance && instance.__umdInternalMemoizedMergedChildContext || emptyObject;

    // Remember the parent context so we can merge with it later.
    // Inherit the parent's did-perform-work value to avoid inadvertantly blocking updates.
    previousContext = contextStackCursor.current;
    push(contextStackCursor, memoizedMergedChildContext, workInProgress);
    push(didPerformWorkStackCursor, didPerformWorkStackCursor.current, workInProgress);

    return true;
};

var invalidateContextProvider = function (workInProgress, didChange) {
    var instance = workInProgress.stateNode;

    if (didChange) {
        // Merge parent and own context.
        // Skip this if we're not updating due to sCU.
        // This avoids unnecessarily recomputing memoized values.
        var mergedContext = processChildContext$1(workInProgress, previousContext, true);
        instance.__umdInternalMemoizedMergedChildContext = mergedContext;

        // Replace the old (or empty) context with the new one.
        // It is important to unwind the context in the reverse order.
        pop(didPerformWorkStackCursor, workInProgress);
        pop(contextStackCursor, workInProgress);
        // Now push the new context and mark that it has changed.
        push(contextStackCursor, mergedContext, workInProgress);
        push(didPerformWorkStackCursor, didChange, workInProgress);
    } else {
        pop(didPerformWorkStackCursor, workInProgress);
        push(didPerformWorkStackCursor, didChange, workInProgress);
    }
};

var resetContext = function () {
    previousContext = emptyObject;
    contextStackCursor.current = emptyObject;
    didPerformWorkStackCursor.current = false;
};

var findCurrentUnmaskedContext$1 = function (fiber) {
    // Currently this is only used with renderSubtreeIntoContainer; not sure if it
    // makes sense elsewhere

    var node = fiber;
    while (node.tag !== HostRoot$3) {
        if (isContextProvider$1(node)) {
            return node.stateNode.__umdInternalMemoizedMergedChildContext;
        }
        var parent = node['return'];
        node = parent;
    }
    return node.stateNode.context;
};

var UmdFiberContext = {
    getUnmaskedContext: getUnmaskedContext_1,
    cacheContext: cacheContext_1,
    getMaskedContext: getMaskedContext,
    hasContextChanged: hasContextChanged,
    isContextConsumer: isContextConsumer_1,
    isContextProvider: isContextProvider_1,
    popContextProvider: popContextProvider_1,
    popTopLevelContextObject: popTopLevelContextObject,
    pushTopLevelContextObject: pushTopLevelContextObject,
    processChildContext: processChildContext_1,
    pushContextProvider: pushContextProvider,
    invalidateContextProvider: invalidateContextProvider,
    resetContext: resetContext,
    findCurrentUnmaskedContext: findCurrentUnmaskedContext$1
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdTypeOfInternalContext
 * 
 */

var UmdTypeOfInternalContext = {
    NoContext: 0,
    AsyncUpdates: 1
};

var IndeterminateComponent$1 = UmdTypeOfWork.IndeterminateComponent;
var ClassComponent$4 = UmdTypeOfWork.ClassComponent;
var HostRoot$5 = UmdTypeOfWork.HostRoot;
var HostComponent$5 = UmdTypeOfWork.HostComponent;
var HostText$3 = UmdTypeOfWork.HostText;
var HostPortal$2 = UmdTypeOfWork.HostPortal;
var CoroutineComponent = UmdTypeOfWork.CoroutineComponent;
var YieldComponent$1 = UmdTypeOfWork.YieldComponent;
var Fragment$1 = UmdTypeOfWork.Fragment;

var NoWork$1 = UmdPriorityLevel.NoWork;

var NoContext = UmdTypeOfInternalContext.NoContext;

var NoEffect$1 = UmdTypeOfSideEffect.NoEffect;



{
    var getComponentName$6 = getComponentName_1;
    var hasBadMapPolyfill = false;
    try {
        var nonExtensibleObject = Object.preventExtensions({});
        /* eslint-disable no-new */
        new Map([[nonExtensibleObject, null]]);
        new Set([nonExtensibleObject]);
        /* eslint-enable no-new */
    } catch (e) {
        // TODO: Consider warning about bad polyfills
        hasBadMapPolyfill = true;
    }
}

// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.


{
    var debugCounter = 1;
}

function FiberNode(tag, key, internalContextTag) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.type = null;
    this.stateNode = null;

    // Fiber
    this['return'] = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;

    this.ref = null;

    this.pendingProps = null;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;

    this.internalContextTag = internalContextTag;

    // Effects
    this.effectTag = NoEffect$1;
    this.nextEffect = null;

    this.firstEffect = null;
    this.lastEffect = null;

    this.pendingWorkPriority = NoWork$1;

    this.alternate = null;

    {
        this._debugID = debugCounter++;
        this._debugSource = null;
        this._debugOwner = null;
        this._debugIsCurrentlyTiming = false;
        if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
            Object.preventExtensions(this);
        }
    }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
var createFiber = function (tag, key, internalContextTag) {
    // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
    return new FiberNode(tag, key, internalContextTag);
};

function shouldConstruct(Component) {
    return !!(Component.prototype && Component.prototype.isUmdComponent);
}

// This is used to create an alternate fiber to do work on.
var createWorkInProgress = function (current, renderPriority) {
    var workInProgress = current.alternate;
    if (workInProgress === null) {
        // We use a double buffering pooling technique because we know that we'll
        // only ever need at most two versions of a tree. We pool the "other" unused
        // node that we're free to reuse. This is lazily created to avoid allocating
        // extra objects for things that are never updated. It also allow us to
        // reclaim the extra memory if needed.
        workInProgress = createFiber(current.tag, current.key, current.internalContextTag);
        workInProgress.type = current.type;
        workInProgress.stateNode = current.stateNode;

        {
            // DEV-only fields
            workInProgress._debugID = current._debugID;
            workInProgress._debugSource = current._debugSource;
            workInProgress._debugOwner = current._debugOwner;
        }

        workInProgress.alternate = current;
        current.alternate = workInProgress;
    } else {
        // We already have an alternate.
        // Reset the effect tag.
        workInProgress.effectTag = NoEffect$1;

        // The effect list is no longer valid.
        workInProgress.nextEffect = null;
        workInProgress.firstEffect = null;
        workInProgress.lastEffect = null;
    }

    workInProgress.pendingWorkPriority = renderPriority;

    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;

    // pendingProps is set by the parent during reconciliation.
    // TODO: Pass this as an argument.

    // These will be overridden during the parent's reconciliation
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;

    return workInProgress;
};

var createHostRootFiber$1 = function () {
    var fiber = createFiber(HostRoot$5, null, NoContext);
    return fiber;
};

var createFiberFromElement = function (element, internalContextTag, priorityLevel) {
    var owner = null;
    {
        owner = element._owner;
    }
    if(element && element.key == "Search"){
        console.log("fiber null");
    }
    var fiber = createFiberFromElementType(element.type, element.key, internalContextTag, owner);
    
    fiber.pendingProps = element.props;
    fiber.pendingWorkPriority = priorityLevel;

    {
        fiber._debugSource = element._source;
        fiber._debugOwner = element._owner;
    }

    return fiber;
};

var createFiberFromFragment = function (elements, internalContextTag, priorityLevel) {
    // TODO: Consider supporting keyed fragments. Technically, we accidentally
    // support that in the existing Umd.
    var fiber = createFiber(Fragment$1, null, internalContextTag);
    fiber.pendingProps = elements;
    fiber.pendingWorkPriority = priorityLevel;
    return fiber;
};

var createFiberFromText = function (content, internalContextTag, priorityLevel) {
    var fiber = createFiber(HostText$3, null, internalContextTag);
    fiber.pendingProps = content;
    fiber.pendingWorkPriority = priorityLevel;
    return fiber;
};

function createFiberFromElementType(type, key, internalContextTag, debugOwner) {
    var fiber = void 0;
    if (typeof type === 'function') {
        fiber = shouldConstruct(type) ? createFiber(ClassComponent$4, key, internalContextTag) : createFiber(IndeterminateComponent$1, key, internalContextTag);
        fiber.type = type;
    } else if (typeof type === 'string') {
        fiber = createFiber(HostComponent$5, key, internalContextTag);
        fiber.type = type;
    } else if (typeof type === 'object' && type !== null && typeof type.tag === 'number') {
        // Currently assumed to be a continuation and therefore is a fiber already.
        // TODO: The yield system is currently broken for updates in some cases.
        // The reified yield stores a fiber, but we don't know which fiber that is;
        // the current or a workInProgress? When the continuation gets rendered here
        // we don't know if we can reuse that fiber or if we need to clone it.
        // There is probably a clever way to restructure this.
        fiber = type;
    } else {
        var info = '';
        {
            if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
                info += ' You likely forgot to export your component from the file ' + "it's defined in.";
            }
            var ownerName = debugOwner ? getComponentName$6(debugOwner) : null;
            if (ownerName) {
                info += '\n\nCheck the render method of `' + ownerName + '`.';
            }
        }
    }
    return fiber;
}

var createFiberFromElementType_1 = createFiberFromElementType;

var createFiberFromHostInstanceForDeletion = function () {
    var fiber = createFiber(HostComponent$5, null, NoContext);
    fiber.type = 'DELETED';
    return fiber;
};

var createFiberFromCoroutine = function (coroutine, internalContextTag, priorityLevel) {
    var fiber = createFiber(CoroutineComponent, coroutine.key, internalContextTag);
    fiber.type = coroutine.handler;
    fiber.pendingProps = coroutine;
    fiber.pendingWorkPriority = priorityLevel;
    return fiber;
};

var createFiberFromYield = function (yieldNode, internalContextTag, priorityLevel) {
    var fiber = createFiber(YieldComponent$1, null, internalContextTag);
    return fiber;
};

var createFiberFromPortal = function (portal, internalContextTag, priorityLevel) {
    var fiber = createFiber(HostPortal$2, portal.key, internalContextTag);
    fiber.pendingProps = portal.children || [];
    fiber.pendingWorkPriority = priorityLevel;
    fiber.stateNode = {
        containerInfo: portal.containerInfo,
        implementation: portal.implementation
    };
    return fiber;
};

var largerPriority = function (p1, p2) {
    return p1 !== NoWork$1 && (p2 === NoWork$1 || p2 > p1) ? p1 : p2;
};

var UmdFiber = {
    createWorkInProgress: createWorkInProgress,
    createHostRootFiber: createHostRootFiber$1,
    createFiberFromElement: createFiberFromElement,
    createFiberFromFragment: createFiberFromFragment,
    createFiberFromText: createFiberFromText,
    createFiberFromElementType: createFiberFromElementType_1,
    createFiberFromHostInstanceForDeletion: createFiberFromHostInstanceForDeletion,
    createFiberFromCoroutine: createFiberFromCoroutine,
    createFiberFromYield: createFiberFromYield,
    createFiberFromPortal: createFiberFromPortal,
    largerPriority: largerPriority
};

var createHostRootFiber = UmdFiber.createHostRootFiber;

var createFiberRoot$1 = function (containerInfo) {
    // Cyclic construction. This cheats the type system right now because
    // stateNode is any.
    var uninitializedFiber = createHostRootFiber();
    var root = {
        current: uninitializedFiber,
        containerInfo: containerInfo,
        isScheduled: false,
        nextScheduledRoot: null,
        context: null,
        pendingContext: null
    };
    uninitializedFiber.stateNode = root;
    return root;
};

var UmdFiberRoot = {
    createFiberRoot: createFiberRoot$1
};

var defaultShowDialog = function (capturedError) {
    return true;
};

var showDialog = defaultShowDialog;

function logCapturedError$1(capturedError) {
    var logError = showDialog(capturedError);

    // Allow injected showDialog() to prevent default console.error logging.
    // This enables renderers like UmdNative to better manage redbox behavior.
    if (logError === false) {
        return;
    }

    var error = capturedError.error;
    {
        var componentName = capturedError.componentName,
            componentStack = capturedError.componentStack,
            errorBoundaryName = capturedError.errorBoundaryName,
            errorBoundaryFound = capturedError.errorBoundaryFound,
            willRetry = capturedError.willRetry;


        var componentNameMessage = componentName ? 'The above error occurred in the <' + componentName + '> component:' : 'The above error occurred in one of your Umd components:';

        var errorBoundaryMessage = void 0;
        // errorBoundaryFound check is sufficient; errorBoundaryName check is to satisfy Flow.
        if (errorBoundaryFound && errorBoundaryName) {
            if (willRetry) {
                errorBoundaryMessage = 'Umd will try to recreate this component tree from scratch ' + ('using the error boundary you provided, ' + errorBoundaryName + '.');
            } else {
                errorBoundaryMessage = 'This error was initially handled by the error boundary ' + errorBoundaryName + '.\n' + 'Recreating the tree from scratch failed so Umd will unmount the tree.';
            }
        } else {
            errorBoundaryMessage = 'Consider adding an error boundary to your tree to customize error handling behavior.\n' + 'You can learn more about error boundaries at https://fb.me/umd-error-boundaries.';
        }
        var combinedMessage = '' + componentNameMessage + componentStack + '\n\n' + ('' + errorBoundaryMessage);

        // In development, we provide our own message with just the component stack.
        // We don't include the original error message and JS stack because the browser
        // has already printed it. Even if the application swallows the error, it is still
        // displayed by the browser thanks to the DEV-only fake event trick in UmdErrorUtils.
        console.error(combinedMessage);
    }
}

var injection$1 = {
    /**
     * Display custom dialog for lifecycle errors.
     * Return false to prevent default behavior of logging to console.error.
     */
    injectDialog: function (fn) {

        showDialog = fn;
    }
};

var logCapturedError_1 = logCapturedError$1;

var UmdFiberErrorLogger = {
    injection: injection$1,
    logCapturedError: logCapturedError_1
};

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdCoroutine
 * 
 */

// The Symbol used to tag the special Umd types. If there is no native Symbol
// nor polyfill, then a plain number is used for performance.
var REACT_COROUTINE_TYPE$1;
var REACT_YIELD_TYPE$1;
if (typeof Symbol === 'function' && Symbol['for']) {
    REACT_COROUTINE_TYPE$1 = Symbol['for']('_element.coroutine');
    REACT_YIELD_TYPE$1 = Symbol['for']('_element.yield');
} else {
    REACT_COROUTINE_TYPE$1 = 0xeac8;
    REACT_YIELD_TYPE$1 = 0xeac9;
}

var createCoroutine = function (children, handler, props) {
    var key = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    var coroutine = {
        // This tag allow us to uniquely identify this as a Umd Coroutine
        $$typeof: REACT_COROUTINE_TYPE$1,
        key: key == null ? null : '' + key,
        children: children,
        handler: handler,
        props: props
    };

    {
        // TODO: Add _store property for marking this as validated.
        if (Object.freeze) {
            Object.freeze(coroutine.props);
            Object.freeze(coroutine);
        }
    }

    return coroutine;
};

var createYield = function (value) {
    var yieldNode = {
        // This tag allow us to uniquely identify this as a Umd Yield
        $$typeof: REACT_YIELD_TYPE$1,
        value: value
    };

    {
        // TODO: Add _store property for marking this as validated.
        if (Object.freeze) {
            Object.freeze(yieldNode);
        }
    }

    return yieldNode;
};

/**
 * Verifies the object is a coroutine object.
 */
var isCoroutine = function (object) {
    return typeof object === 'object' && object !== null && object.$$typeof === REACT_COROUTINE_TYPE$1;
};

/**
 * Verifies the object is a yield object.
 */
var isYield = function (object) {
    return typeof object === 'object' && object !== null && object.$$typeof === REACT_YIELD_TYPE$1;
};

var REACT_YIELD_TYPE_1 = REACT_YIELD_TYPE$1;
var REACT_COROUTINE_TYPE_1 = REACT_COROUTINE_TYPE$1;

var UmdCoroutine = {
    createCoroutine: createCoroutine,
    createYield: createYield,
    isCoroutine: isCoroutine,
    isYield: isYield,
    REACT_YIELD_TYPE: REACT_YIELD_TYPE_1,
    REACT_COROUTINE_TYPE: REACT_COROUTINE_TYPE_1
};

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdPortal
 * 
 */

// The Symbol used to tag the special Umd types. If there is no native Symbol
// nor polyfill, then a plain number is used for performance.
var REACT_PORTAL_TYPE$1 = typeof Symbol === 'function' && Symbol['for'] && Symbol['for']('_element.portal') || 0xeaca;

var createPortal$1 = function (children, containerInfo,
    // TODO: figure out the API for cross-renderer implementation.
    implementation) {
    var key = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    return {
        // This tag allow us to uniquely identify this as a Umd Portal
        $$typeof: REACT_PORTAL_TYPE$1,
        key: key == null ? null : '' + key,
        children: children,
        containerInfo: containerInfo,
        implementation: implementation
    };
};

/**
 * Verifies the object is a portal object.
 */
var isPortal = function (object) {
    return typeof object === 'object' && object !== null && object.$$typeof === REACT_PORTAL_TYPE$1;
};

var REACT_PORTAL_TYPE_1 = REACT_PORTAL_TYPE$1;

var UmdPortal = {
    createPortal: createPortal$1,
    isPortal: isPortal,
    REACT_PORTAL_TYPE: REACT_PORTAL_TYPE_1
};

var REACT_COROUTINE_TYPE = UmdCoroutine.REACT_COROUTINE_TYPE;
var REACT_YIELD_TYPE = UmdCoroutine.REACT_YIELD_TYPE;

var REACT_PORTAL_TYPE = UmdPortal.REACT_PORTAL_TYPE;


{
    var _require3$4 = UmdDebugCurrentFiber_1,
        getCurrentFiberStackAddendum$5 = _require3$4.getCurrentFiberStackAddendum;

    /**
     * Warn if there's no key explicitly set on dynamic arrays of children or
     * object keys are not valid. This allows us to keep track of children between
     * updates.
     */
    var ownerHasKeyUseWarning = {};

    var warnForMissingKey = function (child) {
        if (child === null || typeof child !== 'object') {
            return;
        }
        if (!child._store || child._store.validated || child.key != null) {
            return;
        }
        child._store.validated = true;

        var currentComponentErrorInfo = 'Each child in an array or iterator should have a unique ' + '"key" prop. See https://fb.me/umd-warning-keys for ' + 'more information.' + (getCurrentFiberStackAddendum$5() || '');
        if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
        }
        ownerHasKeyUseWarning[currentComponentErrorInfo] = true;

    };
}

var createWorkInProgress$2 = UmdFiber.createWorkInProgress;
var createFiberFromElement$1 = UmdFiber.createFiberFromElement;
var createFiberFromFragment$1 = UmdFiber.createFiberFromFragment;
var createFiberFromText$1 = UmdFiber.createFiberFromText;
var createFiberFromCoroutine$1 = UmdFiber.createFiberFromCoroutine;
var createFiberFromYield$1 = UmdFiber.createFiberFromYield;
var createFiberFromPortal$1 = UmdFiber.createFiberFromPortal;


var isArray = Array.isArray;

var FunctionalComponent$2 = UmdTypeOfWork.FunctionalComponent;
var ClassComponent$7 = UmdTypeOfWork.ClassComponent;
var HostText$5 = UmdTypeOfWork.HostText;
var HostPortal$5 = UmdTypeOfWork.HostPortal;
var CoroutineComponent$2 = UmdTypeOfWork.CoroutineComponent;
var YieldComponent$3 = UmdTypeOfWork.YieldComponent;
var Fragment$3 = UmdTypeOfWork.Fragment;
var NoEffect$2 = UmdTypeOfSideEffect.NoEffect;
var Placement$3 = UmdTypeOfSideEffect.Placement;
var Deletion$1 = UmdTypeOfSideEffect.Deletion;


var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

var REACT_ELEMENT_TYPE = typeof Symbol === 'function' && Symbol['for'] && Symbol['for']('umd.element') || 0xeac7;

function getIteratorFn(maybeIterable) {
    if (maybeIterable === null || typeof maybeIterable === 'undefined') {
        return null;
    }
    var iteratorFn = ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
    if (typeof iteratorFn === 'function') {
        return iteratorFn;
    }
    return null;
}

function coerceRef(current, element) {
    var mixedRef = element.ref;
    if (mixedRef !== null && typeof mixedRef !== 'function') {
        if (element._owner) {
            var owner = element._owner;
            var inst = void 0;
            if (owner) {
                if (typeof owner.tag === 'number') {
                    var ownerFiber = owner;
                    inst = ownerFiber.stateNode;
                } else {
                    // Stack
                    inst = owner.getPublicInstance();
                }
            }
            var stringRef = '' + mixedRef;
            // Check if previous string ref matches new string ref
            if (current !== null && current.ref !== null && current.ref._stringRef === stringRef) {
                return current.ref;
            }
            var ref = function (value) {
                var refs = inst.refs === emptyObject ? inst.refs = {} : inst.refs;
                if (value === null) {
                    delete refs[stringRef];
                } else {
                    refs[stringRef] = value;
                }
            };
            ref._stringRef = stringRef;
            return ref;
        }
    }
    return mixedRef;
}

function throwOnInvalidObjectType(returnFiber, newChild) {
    if (returnFiber.type !== 'textarea') {
        var addendum = '';
        {
            addendum = ' If you meant to render a collection of children, use an array ' + 'instead.' + (getCurrentFiberStackAddendum$5() || '');
        }
    }
}




// This wrapper function exists because I expect to clone the code in each path
// to be able to optimize each path individually by branching early. This needs
// a compiler or we can do it manually. Helpers that don't need this branching
// live outside of this function.
function ChildReconciler(shouldClone, shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
        if (!shouldTrackSideEffects) {
            // Noop.
            return;
        }
        if (!shouldClone) {
            // When we're reconciling in place we have a work in progress copy. We
            // actually want the current copy. If there is no current copy, then we
            // don't need to track deletion side-effects.
            if (childToDelete.alternate === null) {
                return;
            }
            childToDelete = childToDelete.alternate;
        }
        // Deletions are added in reversed order so we add it to the front.
        // At this point, the return fiber's effect list is empty except for
        // deletions, so we can just append the deletion to the list. The remaining
        // effects aren't added until the complete phase. Once we implement
        // resuming, this may not be true.
        var last = returnFiber.lastEffect;
        if (last !== null) {
            last.nextEffect = childToDelete;
            returnFiber.lastEffect = childToDelete;
        } else {
            returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
        }
        childToDelete.nextEffect = null;
        childToDelete.effectTag = Deletion$1;
    }

    function deleteRemainingChildren(returnFiber, currentFirstChild) {
        if (!shouldTrackSideEffects) {
            // Noop.
            return null;
        }

        // TODO: For the shouldClone case, this could be micro-optimized a bit by
        // assuming that after the first child we've already added everything.
        var childToDelete = currentFirstChild;
        while (childToDelete !== null) {
            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }
        return null;
    }

    function mapRemainingChildren(returnFiber, currentFirstChild) {
        // Add the remaining children to a temporary map so that we can find them by
        // keys quickly. Implicit (null) keys get added to this set with their index
        var existingChildren = new Map();

        var existingChild = currentFirstChild;
        while (existingChild !== null) {
            if (existingChild.key !== null) {
                existingChildren.set(existingChild.key, existingChild);
            } else {
                existingChildren.set(existingChild.index, existingChild);
            }
            existingChild = existingChild.sibling;
        }
        return existingChildren;
    }

    function useFiber(fiber, priority) {
        // We currently set sibling to null and index to 0 here because it is easy
        // to forget to do before returning it. E.g. for the single child case.
        if (shouldClone) {
            var clone = createWorkInProgress$2(fiber, priority);
            clone.index = 0;
            clone.sibling = null;
            return clone;
        } else {
            // We override the pending priority even if it is higher, because if
            // we're reconciling at a lower priority that means that this was
            // down-prioritized.
            fiber.pendingWorkPriority = priority;
            fiber.effectTag = NoEffect$2;
            fiber.index = 0;
            fiber.sibling = null;
            return fiber;
        }
    }

    function placeChild(newFiber, lastPlacedIndex, newIndex) {
        newFiber.index = newIndex;
        if (!shouldTrackSideEffects) {
            // Noop.
            return lastPlacedIndex;
        }
        var current = newFiber.alternate;
        if (current !== null) {
            var oldIndex = current.index;
            if (oldIndex < lastPlacedIndex) {
                // This is a move.
                newFiber.effectTag = Placement$3;
                return lastPlacedIndex;
            } else {
                // This item can stay in place.
                return oldIndex;
            }
        } else {
            // This is an insertion.
            newFiber.effectTag = Placement$3;
            return lastPlacedIndex;
        }
    }

    function placeSingleChild(newFiber) {
        // This is simpler for the single child case. We only need to do a
        // placement for inserting new children.
        if (shouldTrackSideEffects && newFiber.alternate === null) {
            newFiber.effectTag = Placement$3;
        }
        return newFiber;
    }

    function updateTextNode(returnFiber, current, textContent, priority) {
        if (current === null || current.tag !== HostText$5) {
            // Insert
            var created = createFiberFromText$1(textContent, returnFiber.internalContextTag, priority);
            created['return'] = returnFiber;
            return created;
        } else {
            // Update
            var existing = useFiber(current, priority);
            existing.pendingProps = textContent;
            existing['return'] = returnFiber;
            return existing;
        }
    }

    function updateElement(returnFiber, current, element, priority) {
        if (current === null || current.type !== element.type) {
            // Insert
            var created = createFiberFromElement$1(element, returnFiber.internalContextTag, priority);
            created.ref = coerceRef(current, element);
            created['return'] = returnFiber;
            return created;
        } else {
            // Move based on index
            var existing = useFiber(current, priority);
            existing.ref = coerceRef(current, element);
            existing.pendingProps = element.props;
            existing['return'] = returnFiber;
            {
                existing._debugSource = element._source;
                existing._debugOwner = element._owner;
            }
            return existing;
        }
    }

    function updateCoroutine(returnFiber, current, coroutine, priority) {
        // TODO: Should this also compare handler to determine whether to reuse?
        if (current === null || current.tag !== CoroutineComponent$2) {
            // Insert
            var created = createFiberFromCoroutine$1(coroutine, returnFiber.internalContextTag, priority);
            created['return'] = returnFiber;
            return created;
        } else {
            // Move based on index
            var existing = useFiber(current, priority);
            existing.pendingProps = coroutine;
            existing['return'] = returnFiber;
            return existing;
        }
    }

    function updateYield(returnFiber, current, yieldNode, priority) {
        if (current === null || current.tag !== YieldComponent$3) {
            // Insert
            var created = createFiberFromYield$1(yieldNode, returnFiber.internalContextTag, priority);
            created.type = yieldNode.value;
            created['return'] = returnFiber;
            return created;
        } else {
            // Move based on index
            var existing = useFiber(current, priority);
            existing.type = yieldNode.value;
            existing['return'] = returnFiber;
            return existing;
        }
    }

    function updatePortal(returnFiber, current, portal, priority) {
        if (current === null || current.tag !== HostPortal$5 || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation) {
            // Insert
            var created = createFiberFromPortal$1(portal, returnFiber.internalContextTag, priority);
            created['return'] = returnFiber;
            return created;
        } else {
            // Update
            var existing = useFiber(current, priority);
            existing.pendingProps = portal.children || [];
            existing['return'] = returnFiber;
            return existing;
        }
    }

    function updateFragment(returnFiber, current, fragment, priority) {
        if (current === null || current.tag !== Fragment$3) {
            // Insert
            var created = createFiberFromFragment$1(fragment, returnFiber.internalContextTag, priority);
            created['return'] = returnFiber;
            return created;
        } else {
            // Update
            var existing = useFiber(current, priority);
            existing.pendingProps = fragment;
            existing['return'] = returnFiber;
            return existing;
        }
    }

    function createChild(returnFiber, newChild, priority) {
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            // Text nodes doesn't have keys. If the previous node is implicitly keyed
            // we can continue to replace it without aborting even if it is not a text
            // node.
            var created = createFiberFromText$1('' + newChild, returnFiber.internalContextTag, priority);
            created['return'] = returnFiber;
            return created;
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    {
                        var _created = createFiberFromElement$1(newChild, returnFiber.internalContextTag, priority);
                        _created.ref = coerceRef(null, newChild);
                        _created['return'] = returnFiber;
                        return _created;
                    }

                case REACT_COROUTINE_TYPE:
                    {
                        var _created2 = createFiberFromCoroutine$1(newChild, returnFiber.internalContextTag, priority);
                        _created2['return'] = returnFiber;
                        return _created2;
                    }

                case REACT_YIELD_TYPE:
                    {
                        var _created3 = createFiberFromYield$1(newChild, returnFiber.internalContextTag, priority);
                        _created3.type = newChild.value;
                        _created3['return'] = returnFiber;
                        return _created3;
                    }

                case REACT_PORTAL_TYPE:
                    {
                        var _created4 = createFiberFromPortal$1(newChild, returnFiber.internalContextTag, priority);
                        _created4['return'] = returnFiber;
                        return _created4;
                    }
            }

            if (isArray(newChild) || getIteratorFn(newChild)) {
                var _created5 = createFiberFromFragment$1(newChild, returnFiber.internalContextTag, priority);
                _created5['return'] = returnFiber;
                return _created5;
            }

            throwOnInvalidObjectType(returnFiber, newChild);
        }

        {
            if (typeof newChild === 'function') {

            }
        }

        return null;
    }

    function updateSlot(returnFiber, oldFiber, newChild, priority) {
        // Update the fiber if the keys match, otherwise return null.

        var key = oldFiber !== null ? oldFiber.key : null;

        if (typeof newChild === 'string' || typeof newChild === 'number') {
            // Text nodes doesn't have keys. If the previous node is implicitly keyed
            // we can continue to replace it without aborting even if it is not a text
            // node.
            if (key !== null) {
                return null;
            }
            return updateTextNode(returnFiber, oldFiber, '' + newChild, priority);
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    {
                        if (newChild.key === key) {
                            return updateElement(returnFiber, oldFiber, newChild, priority);
                        } else {
                            return null;
                        }
                    }

                case REACT_COROUTINE_TYPE:
                    {
                        if (newChild.key === key) {
                            return updateCoroutine(returnFiber, oldFiber, newChild, priority);
                        } else {
                            return null;
                        }
                    }

                case REACT_YIELD_TYPE:
                    {
                        // Yields doesn't have keys. If the previous node is implicitly keyed
                        // we can continue to replace it without aborting even if it is not a
                        // yield.
                        if (key === null) {
                            return updateYield(returnFiber, oldFiber, newChild, priority);
                        } else {
                            return null;
                        }
                    }

                case REACT_PORTAL_TYPE:
                    {
                        if (newChild.key === key) {
                            return updatePortal(returnFiber, oldFiber, newChild, priority);
                        } else {
                            return null;
                        }
                    }
            }

            if (isArray(newChild) || getIteratorFn(newChild)) {
                // Fragments doesn't have keys so if the previous key is implicit we can
                // update it.
                if (key !== null) {
                    return null;
                }
                return updateFragment(returnFiber, oldFiber, newChild, priority);
            }

            throwOnInvalidObjectType(returnFiber, newChild);
        }



        return null;
    }

    function updateFromMap(existingChildren, returnFiber, newIdx, newChild, priority) {
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            // Text nodes doesn't have keys, so we neither have to check the old nor
            // new node for the key. If both are text nodes, they match.
            var matchedFiber = existingChildren.get(newIdx) || null;
            return updateTextNode(returnFiber, matchedFiber, '' + newChild, priority);
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    {
                        var _matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;
                        return updateElement(returnFiber, _matchedFiber, newChild, priority);
                    }

                case REACT_COROUTINE_TYPE:
                    {
                        var _matchedFiber2 = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;
                        return updateCoroutine(returnFiber, _matchedFiber2, newChild, priority);
                    }

                case REACT_YIELD_TYPE:
                    {
                        // Yields doesn't have keys, so we neither have to check the old nor
                        // new node for the key. If both are yields, they match.
                        var _matchedFiber3 = existingChildren.get(newIdx) || null;
                        return updateYield(returnFiber, _matchedFiber3, newChild, priority);
                    }

                case REACT_PORTAL_TYPE:
                    {
                        var _matchedFiber4 = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;
                        return updatePortal(returnFiber, _matchedFiber4, newChild, priority);
                    }
            }

            if (isArray(newChild) || getIteratorFn(newChild)) {
                var _matchedFiber5 = existingChildren.get(newIdx) || null;
                return updateFragment(returnFiber, _matchedFiber5, newChild, priority);
            }

            throwOnInvalidObjectType(returnFiber, newChild);
        }



        return null;
    }

    /**
     * Warns if there is a duplicate or missing key
     */
    function warnOnInvalidKey(child, knownKeys) {
        {
            if (typeof child !== 'object' || child === null) {
                return knownKeys;
            }
            switch (child.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_COROUTINE_TYPE:
                case REACT_PORTAL_TYPE:
                    warnForMissingKey(child);
                    var key = child.key;
                    if (typeof key !== 'string') {
                        break;
                    }
                    if (knownKeys === null) {
                        knownKeys = new Set();
                        knownKeys.add(key);
                        break;
                    }
                    if (!knownKeys.has(key)) {
                        knownKeys.add(key);
                        break;
                    }
                    break;
                default:
                    break;
            }
        }
        return knownKeys;
    }

    function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, priority) {
        // This algorithm can't optimize by searching from boths ends since we
        // don't have backpointers on fibers. I'm trying to see how far we can get
        // with that model. If it ends up not being worth the tradeoffs, we can
        // add it later.

        // Even with a two ended optimization, we'd want to optimize for the case
        // where there are few changes and brute force the comparison instead of
        // going for the Map. It'd like to explore hitting that path first in
        // forward-only mode and only go for the Map once we notice that we need
        // lots of look ahead. This doesn't handle reversal as well as two ended
        // search but that's unusual. Besides, for the two ended optimization to
        // work on Iterables, we'd need to copy the whole set.

        // In this first iteration, we'll just live with hitting the bad case
        // (adding everything to a Map) in for every insert/move.

        // If you change this code, also update reconcileChildrenIterator() which
        // uses the same algorithm.

        {
            // First, validate keys.
            var knownKeys = null;
            for (var i = 0; i < newChildren.length; i++) {
                var child = newChildren[i];
                knownKeys = warnOnInvalidKey(child, knownKeys);
            }
        }

        var resultingFirstChild = null;
        var previousNewFiber = null;

        var oldFiber = currentFirstChild;
        var lastPlacedIndex = 0;
        var newIdx = 0;
        var nextOldFiber = null;
        for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
            if (oldFiber.index > newIdx) {
                nextOldFiber = oldFiber;
                oldFiber = null;
            } else {
                nextOldFiber = oldFiber.sibling;
            }
            var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], priority);
            if (newFiber === null) {
                // TODO: This breaks on empty slots like null children. That's
                // unfortunate because it triggers the slow path all the time. We need
                // a better way to communicate whether this was a miss or null,
                // boolean, undefined, etc.
                if (oldFiber === null) {
                    oldFiber = nextOldFiber;
                }
                break;
            }
            if (shouldTrackSideEffects) {
                if (oldFiber && newFiber.alternate === null) {
                    // We matched the slot, but we didn't reuse the existing fiber, so we
                    // need to delete the existing child.
                    deleteChild(returnFiber, oldFiber);
                }
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                // TODO: Move out of the loop. This only happens for the first run.
                resultingFirstChild = newFiber;
            } else {
                // TODO: Defer siblings if we're not at the right index for this slot.
                // I.e. if we had null values before, then we want to defer this
                // for each null value. However, we also don't want to call updateSlot
                // with the previous one.
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
            oldFiber = nextOldFiber;
        }

        if (newIdx === newChildren.length) {
            // We've reached the end of the new children. We can delete the rest.
            deleteRemainingChildren(returnFiber, oldFiber);
            return resultingFirstChild;
        }

        if (oldFiber === null) {
            // If we don't have any more existing children we can choose a fast path
            // since the rest will all be insertions.
            for (; newIdx < newChildren.length; newIdx++) {
                var _newFiber = createChild(returnFiber, newChildren[newIdx], priority);
                if (!_newFiber) {
                    continue;
                }
                lastPlacedIndex = placeChild(_newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    // TODO: Move out of the loop. This only happens for the first run.
                    resultingFirstChild = _newFiber;
                } else {
                    previousNewFiber.sibling = _newFiber;
                }
                previousNewFiber = _newFiber;
            }
            return resultingFirstChild;
        }

        // Add all children to a key map for quick lookups.
        var existingChildren = mapRemainingChildren(returnFiber, oldFiber);

        // Keep scanning and use the map to restore deleted items as moves.
        for (; newIdx < newChildren.length; newIdx++) {
            var _newFiber2 = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx], priority);
            if (_newFiber2) {
                if (shouldTrackSideEffects) {
                    if (_newFiber2.alternate !== null) {
                        // The new fiber is a work in progress, but if there exists a
                        // current, that means that we reused the fiber. We need to delete
                        // it from the child list so that we don't add it to the deletion
                        // list.
                        existingChildren['delete'](_newFiber2.key === null ? newIdx : _newFiber2.key);
                    }
                }
                lastPlacedIndex = placeChild(_newFiber2, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    resultingFirstChild = _newFiber2;
                } else {
                    previousNewFiber.sibling = _newFiber2;
                }
                previousNewFiber = _newFiber2;
            }
        }

        if (shouldTrackSideEffects) {
            // Any existing children that weren't consumed above were deleted. We need
            // to add them to the deletion list.
            existingChildren.forEach(function (child) {
                return deleteChild(returnFiber, child);
            });
        }

        return resultingFirstChild;
    }

    function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildrenIterable, priority) {
        // This is the same implementation as reconcileChildrenArray(),
        // but using the iterator instead.

        var iteratorFn = getIteratorFn(newChildrenIterable);

        {
            // Warn about using Maps as children
            if (typeof newChildrenIterable.entries === 'function') {
                var possibleMap = newChildrenIterable;
                if (possibleMap.entries === iteratorFn) {
                    didWarnAboutMaps = true;
                }
            }

            // First, validate keys.
            // We'll get a different iterator later for the main pass.
            var _newChildren = iteratorFn.call(newChildrenIterable);
            if (_newChildren) {
                var knownKeys = null;
                var _step = _newChildren.next();
                for (; !_step.done; _step = _newChildren.next()) {
                    var child = _step.value;
                    knownKeys = warnOnInvalidKey(child, knownKeys);
                }
            }
        }

        var newChildren = iteratorFn.call(newChildrenIterable);

        var resultingFirstChild = null;
        var previousNewFiber = null;

        var oldFiber = currentFirstChild;
        var lastPlacedIndex = 0;
        var newIdx = 0;
        var nextOldFiber = null;

        var step = newChildren.next();
        for (; oldFiber !== null && !step.done; newIdx++, step = newChildren.next()) {
            if (oldFiber.index > newIdx) {
                nextOldFiber = oldFiber;
                oldFiber = null;
            } else {
                nextOldFiber = oldFiber.sibling;
            }
            var newFiber = updateSlot(returnFiber, oldFiber, step.value, priority);
            if (newFiber === null) {
                // TODO: This breaks on empty slots like null children. That's
                // unfortunate because it triggers the slow path all the time. We need
                // a better way to communicate whether this was a miss or null,
                // boolean, undefined, etc.
                if (!oldFiber) {
                    oldFiber = nextOldFiber;
                }
                break;
            }
            if (shouldTrackSideEffects) {
                if (oldFiber && newFiber.alternate === null) {
                    // We matched the slot, but we didn't reuse the existing fiber, so we
                    // need to delete the existing child.
                    deleteChild(returnFiber, oldFiber);
                }
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                // TODO: Move out of the loop. This only happens for the first run.
                resultingFirstChild = newFiber;
            } else {
                // TODO: Defer siblings if we're not at the right index for this slot.
                // I.e. if we had null values before, then we want to defer this
                // for each null value. However, we also don't want to call updateSlot
                // with the previous one.
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
            oldFiber = nextOldFiber;
        }

        if (step.done) {
            // We've reached the end of the new children. We can delete the rest.
            deleteRemainingChildren(returnFiber, oldFiber);
            return resultingFirstChild;
        }

        if (oldFiber === null) {
            // If we don't have any more existing children we can choose a fast path
            // since the rest will all be insertions.
            for (; !step.done; newIdx++, step = newChildren.next()) {
                var _newFiber3 = createChild(returnFiber, step.value, priority);
                if (_newFiber3 === null) {
                    continue;
                }
                lastPlacedIndex = placeChild(_newFiber3, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    // TODO: Move out of the loop. This only happens for the first run.
                    resultingFirstChild = _newFiber3;
                } else {
                    previousNewFiber.sibling = _newFiber3;
                }
                previousNewFiber = _newFiber3;
            }
            return resultingFirstChild;
        }

        // Add all children to a key map for quick lookups.
        var existingChildren = mapRemainingChildren(returnFiber, oldFiber);

        // Keep scanning and use the map to restore deleted items as moves.
        for (; !step.done; newIdx++, step = newChildren.next()) {
            var _newFiber4 = updateFromMap(existingChildren, returnFiber, newIdx, step.value, priority);
            if (_newFiber4 !== null) {
                if (shouldTrackSideEffects) {
                    if (_newFiber4.alternate !== null) {
                        // The new fiber is a work in progress, but if there exists a
                        // current, that means that we reused the fiber. We need to delete
                        // it from the child list so that we don't add it to the deletion
                        // list.
                        existingChildren['delete'](_newFiber4.key === null ? newIdx : _newFiber4.key);
                    }
                }
                lastPlacedIndex = placeChild(_newFiber4, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    resultingFirstChild = _newFiber4;
                } else {
                    previousNewFiber.sibling = _newFiber4;
                }
                previousNewFiber = _newFiber4;
            }
        }

        if (shouldTrackSideEffects) {
            // Any existing children that weren't consumed above were deleted. We need
            // to add them to the deletion list.
            existingChildren.forEach(function (child) {
                return deleteChild(returnFiber, child);
            });
        }

        return resultingFirstChild;
    }

    function reconcileSingleTextNode(returnFiber, currentFirstChild, textContent, priority) {
        // There's no need to check for keys on text nodes since we don't have a
        // way to define them.
        if (currentFirstChild !== null && currentFirstChild.tag === HostText$5) {
            // We already have an existing node so let's just update it and delete
            // the rest.
            deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
            var existing = useFiber(currentFirstChild, priority);
            existing.pendingProps = textContent;
            existing['return'] = returnFiber;
            return existing;
        }
        // The existing first child is not a text node so we need to create one
        // and delete the existing ones.
        deleteRemainingChildren(returnFiber, currentFirstChild);
        var created = createFiberFromText$1(textContent, returnFiber.internalContextTag, priority);
        created['return'] = returnFiber;
        return created;
    }

    function reconcileSingleElement(returnFiber, currentFirstChild, element, priority) {
        var key = element.key;
        var child = currentFirstChild;
        while (child !== null) {
            // TODO: If key === null and child.key === null, then this only applies to
            // the first item in the list.
            if (child.key === key) {
                if (child.type === element.type) {
                    deleteRemainingChildren(returnFiber, child.sibling);
                    var existing = useFiber(child, priority);
                    existing.ref = coerceRef(child, element);
                    existing.pendingProps = element.props;
                    existing['return'] = returnFiber;
                    {
                        existing._debugSource = element._source;
                        existing._debugOwner = element._owner;
                    }
                    return existing;
                } else {
                    deleteRemainingChildren(returnFiber, child);
                    break;
                }
            } else {
                deleteChild(returnFiber, child);
            }
            child = child.sibling;
        }

        var created = createFiberFromElement$1(element, returnFiber.internalContextTag, priority);
        created.ref = coerceRef(currentFirstChild, element);
        created['return'] = returnFiber;
        return created;
    }

    function reconcileSingleCoroutine(returnFiber, currentFirstChild, coroutine, priority) {
        var key = coroutine.key;
        var child = currentFirstChild;
        while (child !== null) {
            // TODO: If key === null and child.key === null, then this only applies to
            // the first item in the list.
            if (child.key === key) {
                if (child.tag === CoroutineComponent$2) {
                    deleteRemainingChildren(returnFiber, child.sibling);
                    var existing = useFiber(child, priority);
                    existing.pendingProps = coroutine;
                    existing['return'] = returnFiber;
                    return existing;
                } else {
                    deleteRemainingChildren(returnFiber, child);
                    break;
                }
            } else {
                deleteChild(returnFiber, child);
            }
            child = child.sibling;
        }

        var created = createFiberFromCoroutine$1(coroutine, returnFiber.internalContextTag, priority);
        created['return'] = returnFiber;
        return created;
    }

    function reconcileSingleYield(returnFiber, currentFirstChild, yieldNode, priority) {
        // There's no need to check for keys on yields since they're stateless.
        var child = currentFirstChild;
        if (child !== null) {
            if (child.tag === YieldComponent$3) {
                deleteRemainingChildren(returnFiber, child.sibling);
                var existing = useFiber(child, priority);
                existing.type = yieldNode.value;
                existing['return'] = returnFiber;
                return existing;
            } else {
                deleteRemainingChildren(returnFiber, child);
            }
        }

        var created = createFiberFromYield$1(yieldNode, returnFiber.internalContextTag, priority);
        created.type = yieldNode.value;
        created['return'] = returnFiber;
        return created;
    }

    function reconcileSinglePortal(returnFiber, currentFirstChild, portal, priority) {
        var key = portal.key;
        var child = currentFirstChild;
        while (child !== null) {
            // TODO: If key === null and child.key === null, then this only applies to
            // the first item in the list.
            if (child.key === key) {
                if (child.tag === HostPortal$5 && child.stateNode.containerInfo === portal.containerInfo && child.stateNode.implementation === portal.implementation) {
                    deleteRemainingChildren(returnFiber, child.sibling);
                    var existing = useFiber(child, priority);
                    existing.pendingProps = portal.children || [];
                    existing['return'] = returnFiber;
                    return existing;
                } else {
                    deleteRemainingChildren(returnFiber, child);
                    break;
                }
            } else {
                deleteChild(returnFiber, child);
            }
            child = child.sibling;
        }

        var created = createFiberFromPortal$1(portal, returnFiber.internalContextTag, priority);
        created['return'] = returnFiber;
        return created;
    }

    // This API will tag the children with the side-effect of the reconciliation
    // itself. They will be added to the side-effect list as we pass through the
    // children and the parent.
    function reconcileChildFibers(returnFiber, currentFirstChild, newChild, priority) {
        // This function is not recursive.
        // If the top level item is an array, we treat it as a set of children,
        // not as a fragment. Nested arrays on the other hand will be treated as
        // fragment nodes. Recursion happens at the normal flow.

        // Handle object types
        var isObject = typeof newChild === 'object' && newChild !== null;
        if (isObject) {
            // Support only the subset of return types that Stack supports. Treat
            // everything else as empty, but log a warning.
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, priority));

                case REACT_COROUTINE_TYPE:
                    return placeSingleChild(reconcileSingleCoroutine(returnFiber, currentFirstChild, newChild, priority));

                case REACT_YIELD_TYPE:
                    return placeSingleChild(reconcileSingleYield(returnFiber, currentFirstChild, newChild, priority));

                case REACT_PORTAL_TYPE:
                    return placeSingleChild(reconcileSinglePortal(returnFiber, currentFirstChild, newChild, priority));
            }
        }

        if (typeof newChild === 'string' || typeof newChild === 'number') {
            return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, '' + newChild, priority));
        }

        if (isArray(newChild)) {
            return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, priority);
        }

        if (getIteratorFn(newChild)) {
            return reconcileChildrenIterator(returnFiber, currentFirstChild, newChild, priority);
        }

        if (isObject) {
            throwOnInvalidObjectType(returnFiber, newChild);
        }

        if (typeof newChild === 'undefined') {
            // If the new child is undefined, and the return fiber is a composite
            // component, throw an error. If Fiber return types are disabled,
            // we already threw above.
            switch (returnFiber.tag) {
                case ClassComponent$7:
                    {
                        {
                            var instance = returnFiber.stateNode;
                            if (instance.render._isMockFunction) {
                                // We allow auto-mocks to proceed as if they're returning null.
                                break;
                            }
                        }
                    }

            }
        }

        // Remaining cases are all treated as empty.
        return deleteRemainingChildren(returnFiber, currentFirstChild);
    }

    return reconcileChildFibers;
}

var reconcileChildFibers$1 = ChildReconciler(true, true);

var reconcileChildFibersInPlace$1 = ChildReconciler(false, true);

var mountChildFibersInPlace$1 = ChildReconciler(false, false);

var cloneChildFibers$1 = function (current, workInProgress) {

    if (workInProgress.child === null) {
        return;
    }

    var currentChild = workInProgress.child;
    var newChild = createWorkInProgress$2(currentChild, currentChild.pendingWorkPriority);
    // TODO: Pass this as an argument, since it's easy to forget.
    newChild.pendingProps = currentChild.pendingProps;
    workInProgress.child = newChild;

    newChild['return'] = workInProgress;
    while (currentChild.sibling !== null) {
        currentChild = currentChild.sibling;
        newChild = newChild.sibling = createWorkInProgress$2(currentChild, currentChild.pendingWorkPriority);
        newChild.pendingProps = currentChild.pendingProps;
        newChild['return'] = workInProgress;
    }
    newChild.sibling = null;
};

var UmdChildFiber = {
    reconcileChildFibers: reconcileChildFibers$1,
    reconcileChildFibersInPlace: reconcileChildFibersInPlace$1,
    mountChildFibersInPlace: mountChildFibersInPlace$1,
    cloneChildFibers: cloneChildFibers$1
};

var Update$1 = UmdTypeOfSideEffect.Update;



var AsyncUpdates$1 = UmdTypeOfInternalContext.AsyncUpdates;

var cacheContext$1 = UmdFiberContext.cacheContext;
var getMaskedContext$2 = UmdFiberContext.getMaskedContext;
var getUnmaskedContext$2 = UmdFiberContext.getUnmaskedContext;
var isContextConsumer$1 = UmdFiberContext.isContextConsumer;

var addUpdate$1 = UmdFiberUpdateQueue.addUpdate;
var addReplaceUpdate$1 = UmdFiberUpdateQueue.addReplaceUpdate;
var addForceUpdate$1 = UmdFiberUpdateQueue.addForceUpdate;
var beginUpdateQueue$2 = UmdFiberUpdateQueue.beginUpdateQueue;

var _require5 = UmdFiberContext;
var hasContextChanged$2 = _require5.hasContextChanged;

var isMounted$1 = UmdFiberTreeReflection.isMounted;







var fakeInternalInstance = {};
var isArray$1 = Array.isArray;

{
    var _require7$1 = UmdDebugFiberPerf_1,
        startPhaseTimer$1 = _require7$1.startPhaseTimer,
        stopPhaseTimer$1 = _require7$1.stopPhaseTimer;




    // This is so gross but it's at least non-critical and can be removed if
    // it causes problems. This is meant to give a nicer error message for
    // UmdDOM15.unstable_renderSubtreeIntoContainer(umdDOM16Component,
    // ...)) which otherwise throws a "_processChildContext is not a function"
    // exception.
    Object.defineProperty(fakeInternalInstance, '_processChildContext', {
        enumerable: false,
        value: function () {
        }
    });
    Object.freeze(fakeInternalInstance);
}

var UmdFiberClassComponent = function (scheduleUpdate, getPriorityContext, memoizeProps, memoizeState) {
    // Class component state updater
    var updater = {
        isMounted: isMounted$1,
        enqueueSetState: function (instance, partialState, callback) {
            var fiber = UmdInstanceMap_1.get(instance);
            var priorityLevel = getPriorityContext(fiber, false);
            callback = callback === undefined ? null : callback;

            addUpdate$1(fiber, partialState, callback, priorityLevel);
            scheduleUpdate(fiber, priorityLevel);
        },
        enqueueReplaceState: function (instance, state, callback) {
            var fiber = UmdInstanceMap_1.get(instance);
            var priorityLevel = getPriorityContext(fiber, false);
            callback = callback === undefined ? null : callback;

            addReplaceUpdate$1(fiber, state, callback, priorityLevel);
            scheduleUpdate(fiber, priorityLevel);
        },
        enqueueForceUpdate: function (instance, callback) {
            var fiber = UmdInstanceMap_1.get(instance);
            var priorityLevel = getPriorityContext(fiber, false);
            callback = callback === undefined ? null : callback;

            addForceUpdate$1(fiber, callback, priorityLevel);
            scheduleUpdate(fiber, priorityLevel);
        }
    };

    function checkShouldComponentUpdate(workInProgress, oldProps, newProps, oldState, newState, newContext) {
        if (oldProps === null || workInProgress.updateQueue !== null && workInProgress.updateQueue.hasForceUpdate) {
            // If the workInProgress already has an Update effect, return true
            return true;
        }

        var instance = workInProgress.stateNode;
        var type = workInProgress.type;
        if (typeof instance.shouldComponentUpdate === 'function') {
            {
                startPhaseTimer$1(workInProgress, 'shouldComponentUpdate');
            }
            var shouldUpdate = instance.shouldComponentUpdate(newProps, newState, newContext);
            {
                stopPhaseTimer$1();
            }


            return shouldUpdate;
        }

        if (type.prototype && type.prototype.isPureUmdComponent) {
            return !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState);
        }

        return true;
    }

    function checkClassInstance(workInProgress) {

    }

    function resetInputPointers(workInProgress, instance) {
        instance.props = workInProgress.memoizedProps;
        instance.state = workInProgress.memoizedState;
    }

    function adoptClassInstance(workInProgress, instance) {
        instance.updater = updater;
        workInProgress.stateNode = instance;
        // The instance needs access to the fiber so that it can schedule updates
        UmdInstanceMap_1.set(instance, workInProgress);
        {
            instance._umdInternalInstance = fakeInternalInstance;
        }
    }

    function constructClassInstance(workInProgress, props) {
        var ctor = workInProgress.type;
        var unmaskedContext = getUnmaskedContext$2(workInProgress);
        var needsContext = isContextConsumer$1(workInProgress);
        var context = needsContext ? getMaskedContext$2(workInProgress, unmaskedContext) : emptyObject;
        var instance = new ctor(props, context);
        adoptClassInstance(workInProgress, instance);

        // Cache unmasked context so we can avoid recreating masked context unless necessary.
        // UmdFiberContext usually updates this cache but can't for newly-created instances.
        if (needsContext) {
            cacheContext$1(workInProgress, unmaskedContext, context);
        }

        return instance;
    }

    function callComponentWillMount(workInProgress, instance) {
        {
            startPhaseTimer$1(workInProgress, 'componentWillMount');
        }
        var oldState = instance.state;
        instance.componentWillMount();
        {
            stopPhaseTimer$1();
        }

        if (oldState !== instance.state) {

            updater.enqueueReplaceState(instance, instance.state, null);
        }
    }

    function callComponentWillReceiveProps(workInProgress, instance, newProps, newContext) {
        {
            startPhaseTimer$1(workInProgress, 'componentWillReceiveProps');
        }
        var oldState = instance.state;
        instance.componentWillReceiveProps(newProps, newContext);
        {
            stopPhaseTimer$1();
        }

        if (instance.state !== oldState) {

            updater.enqueueReplaceState(instance, instance.state, null);
        }
    }

    // Invokes the mount life-cycles on a previously never rendered instance.
    function mountClassInstance(workInProgress, priorityLevel) {
        var current = workInProgress.alternate;

        {
            checkClassInstance(workInProgress);
        }

        var instance = workInProgress.stateNode;
        var state = instance.state || null;

        var props = workInProgress.pendingProps;

        var unmaskedContext = getUnmaskedContext$2(workInProgress);

        instance.props = props;
        instance.state = state;
        instance.refs = emptyObject;
        instance.context = getMaskedContext$2(workInProgress, unmaskedContext);

        if (UmdFeatureFlags_1.enableAsyncSubtreeAPI && workInProgress.type != null && workInProgress.type.prototype != null && workInProgress.type.prototype.unstable_isAsyncUmdComponent === true) {
            workInProgress.internalContextTag |= AsyncUpdates$1;
        }

        if (typeof instance.componentWillMount === 'function') {
            callComponentWillMount(workInProgress, instance);
            // If we had additional state updates during this life-cycle, let's
            // process them now.
            var updateQueue = workInProgress.updateQueue;
            if (updateQueue !== null) {
                instance.state = beginUpdateQueue$2(current, workInProgress, updateQueue, instance, state, props, priorityLevel);
            }
        }
        if (typeof instance.componentDidMount === 'function') {
            workInProgress.effectTag |= Update$1;
        }
    }


    // Invokes the update life-cycles and returns false if it shouldn't rerender.
    function updateClassInstance(current, workInProgress, priorityLevel) {
        var instance = workInProgress.stateNode;
        resetInputPointers(workInProgress, instance);

        var oldProps = workInProgress.memoizedProps;
        var newProps = workInProgress.pendingProps;
        if (!newProps) {
            // If there aren't any new props, then we'll reuse the memoized props.
            // This could be from already completed work.
            newProps = oldProps;
        }
        var oldContext = instance.context;
        var newUnmaskedContext = getUnmaskedContext$2(workInProgress);
        var newContext = getMaskedContext$2(workInProgress, newUnmaskedContext);

        // Note: During these life-cycles, instance.props/instance.state are what
        // ever the previously attempted to render - not the "current". However,
        // during componentDidUpdate we pass the "current" props.

        if (typeof instance.componentWillReceiveProps === 'function' && (oldProps !== newProps || oldContext !== newContext)) {
            callComponentWillReceiveProps(workInProgress, instance, newProps, newContext);
        }

        // Compute the next state using the memoized state and the update queue.
        var oldState = workInProgress.memoizedState;
        // TODO: Previous state can be null.
        var newState = void 0;
        if (workInProgress.updateQueue !== null) {
            newState = beginUpdateQueue$2(current, workInProgress, workInProgress.updateQueue, instance, oldState, newProps, priorityLevel);
        } else {
            newState = oldState;
        }

        if (oldProps === newProps && oldState === newState && !hasContextChanged$2() && !(workInProgress.updateQueue !== null && workInProgress.updateQueue.hasForceUpdate)) {
            // If an update was already in progress, we should schedule an Update
            // effect even though we're bailing out, so that cWU/cDU are called.
            if (typeof instance.componentDidUpdate === 'function') {
                if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
                    workInProgress.effectTag |= Update$1;
                }
            }
            return false;
        }

        var shouldUpdate = checkShouldComponentUpdate(workInProgress, oldProps, newProps, oldState, newState, newContext);

        if (shouldUpdate) {
            if (typeof instance.componentWillUpdate === 'function') {
                {
                    startPhaseTimer$1(workInProgress, 'componentWillUpdate');
                }
                instance.componentWillUpdate(newProps, newState, newContext);
                {
                    stopPhaseTimer$1();
                }
            }
            if (typeof instance.componentDidUpdate === 'function') {
                workInProgress.effectTag |= Update$1;
            }
        } else {
            // If an update was already in progress, we should schedule an Update
            // effect even though we're bailing out, so that cWU/cDU are called.
            if (typeof instance.componentDidUpdate === 'function') {
                if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
                    workInProgress.effectTag |= Update$1;
                }
            }

            // If shouldComponentUpdate returned false, we should still update the
            // memoized props/state to indicate that this work can be reused.
            memoizeProps(workInProgress, newProps);
            memoizeState(workInProgress, newState);
        }

        // Update the existing instance's state, props, and context pointers even
        // if shouldComponentUpdate returns false.
        instance.props = newProps;
        instance.state = newState;
        instance.context = newContext;

        return shouldUpdate;
    }

    return {
        adoptClassInstance: adoptClassInstance,
        constructClassInstance: constructClassInstance,
        mountClassInstance: mountClassInstance,
        // resumeMountClassInstance,
        updateClassInstance: updateClassInstance
    };
};

var mountChildFibersInPlace = UmdChildFiber.mountChildFibersInPlace;
var reconcileChildFibers = UmdChildFiber.reconcileChildFibers;
var reconcileChildFibersInPlace = UmdChildFiber.reconcileChildFibersInPlace;
var cloneChildFibers = UmdChildFiber.cloneChildFibers;

var beginUpdateQueue$1 = UmdFiberUpdateQueue.beginUpdateQueue;



var getMaskedContext$1 = UmdFiberContext.getMaskedContext;
var getUnmaskedContext$1 = UmdFiberContext.getUnmaskedContext;
var hasContextChanged$1 = UmdFiberContext.hasContextChanged;
var pushContextProvider$1 = UmdFiberContext.pushContextProvider;
var pushTopLevelContextObject$1 = UmdFiberContext.pushTopLevelContextObject;
var invalidateContextProvider$1 = UmdFiberContext.invalidateContextProvider;

var IndeterminateComponent$2 = UmdTypeOfWork.IndeterminateComponent;
var FunctionalComponent$1 = UmdTypeOfWork.FunctionalComponent;
var ClassComponent$6 = UmdTypeOfWork.ClassComponent;
var HostRoot$7 = UmdTypeOfWork.HostRoot;
var HostComponent$7 = UmdTypeOfWork.HostComponent;
var HostText$4 = UmdTypeOfWork.HostText;
var HostPortal$4 = UmdTypeOfWork.HostPortal;
var CoroutineComponent$1 = UmdTypeOfWork.CoroutineComponent;
var CoroutineHandlerPhase = UmdTypeOfWork.CoroutineHandlerPhase;
var YieldComponent$2 = UmdTypeOfWork.YieldComponent;
var Fragment$2 = UmdTypeOfWork.Fragment;

var NoWork$3 = UmdPriorityLevel.NoWork;
var OffscreenPriority$1 = UmdPriorityLevel.OffscreenPriority;

var PerformedWork$1 = UmdTypeOfSideEffect.PerformedWork;
var Placement$2 = UmdTypeOfSideEffect.Placement;
var ContentReset$1 = UmdTypeOfSideEffect.ContentReset;
var Err$1 = UmdTypeOfSideEffect.Err;
var Ref$1 = UmdTypeOfSideEffect.Ref;



var UmdCurrentOwner$2 = UmdGlobalSharedState_1.UmdCurrentOwner;


{
    var UmdDebugCurrentFiber$4 = UmdDebugCurrentFiber_1;

    var _require7 = UmdDebugFiberPerf_1,
        cancelWorkTimer = _require7.cancelWorkTimer;
    var warnedAboutStatelessRefs = {};
}

var UmdFiberBeginWork = function (config, hostContext, hydrationContext, scheduleUpdate, getPriorityContext) {
    var shouldSetTextContent = config.shouldSetTextContent,
        useSyncScheduling = config.useSyncScheduling,
        shouldDeprioritizeSubtree = config.shouldDeprioritizeSubtree;
    var pushHostContext = hostContext.pushHostContext,
        pushHostContainer = hostContext.pushHostContainer;
    var enterHydrationState = hydrationContext.enterHydrationState,
        resetHydrationState = hydrationContext.resetHydrationState,
        tryToClaimNextHydratableInstance = hydrationContext.tryToClaimNextHydratableInstance;

    var _UmdFiberClassCompo = UmdFiberClassComponent(scheduleUpdate, getPriorityContext, memoizeProps, memoizeState),
        adoptClassInstance = _UmdFiberClassCompo.adoptClassInstance,
        constructClassInstance = _UmdFiberClassCompo.constructClassInstance,
        mountClassInstance = _UmdFiberClassCompo.mountClassInstance,
        updateClassInstance = _UmdFiberClassCompo.updateClassInstance;

    function reconcileChildren(current, workInProgress, nextChildren) {
        var priorityLevel = workInProgress.pendingWorkPriority;
        reconcileChildrenAtPriority(current, workInProgress, nextChildren, priorityLevel);
    }

    function reconcileChildrenAtPriority(current, workInProgress, nextChildren, priorityLevel) {
        if (current === null) {
            // If this is a fresh new component that hasn't been rendered yet, we
            // won't update its child set by applying minimal side-effects. Instead,
            // we will add them all to the child before it gets rendered. That means
            // we can optimize this reconciliation pass by not tracking side-effects.
            workInProgress.child = mountChildFibersInPlace(workInProgress, workInProgress.child, nextChildren, priorityLevel);
        } else if (current.child === workInProgress.child) {
            // If the current child is the same as the work in progress, it means that
            // we haven't yet started any work on these children. Therefore, we use
            // the clone algorithm to create a copy of all the current children.

            // If we had any progressed work already, that is invalid at this point so
            // let's throw it out.
            workInProgress.child = reconcileChildFibers(workInProgress, workInProgress.child, nextChildren, priorityLevel);
        } else {
            // If, on the other hand, it is already using a clone, that means we've
            // already begun some work on this tree and we can continue where we left
            // off by reconciling against the existing children.
            workInProgress.child = reconcileChildFibersInPlace(workInProgress, workInProgress.child, nextChildren, priorityLevel);
        }
    }

    function updateFragment(current, workInProgress) {
        var nextChildren = workInProgress.pendingProps;
        if (hasContextChanged$1()) {
            // Normally we can bail out on props equality but if context has changed
            // we don't do the bailout and we have to reuse existing props instead.
            if (nextChildren === null) {
                nextChildren = workInProgress.memoizedProps;
            }
        } else if (nextChildren === null || workInProgress.memoizedProps === nextChildren) {
            return bailoutOnAlreadyFinishedWork(current, workInProgress);
        }
        reconcileChildren(current, workInProgress, nextChildren);
        memoizeProps(workInProgress, nextChildren);
        return workInProgress.child;
    }

    function markRef(current, workInProgress) {
        var ref = workInProgress.ref;
        if (ref !== null && (!current || current.ref !== ref)) {
            // Schedule a Ref effect
            workInProgress.effectTag |= Ref$1;
        }
    }

    function updateFunctionalComponent(current, workInProgress) {
        var fn = workInProgress.type;
        var nextProps = workInProgress.pendingProps;

        var memoizedProps = workInProgress.memoizedProps;
        if (hasContextChanged$1()) {
            // Normally we can bail out on props equality but if context has changed
            // we don't do the bailout and we have to reuse existing props instead.
            if (nextProps === null) {
                nextProps = memoizedProps;
            }
        } else {
            if (nextProps === null || memoizedProps === nextProps) {
                return bailoutOnAlreadyFinishedWork(current, workInProgress);
            }
            // TODO: consider bringing fn.shouldComponentUpdate() back.
            // It used to be here.
        }

        var unmaskedContext = getUnmaskedContext$1(workInProgress);
        var context = getMaskedContext$1(workInProgress, unmaskedContext);

        var nextChildren;

        {
            UmdCurrentOwner$2.current = workInProgress;
            UmdDebugCurrentFiber$4.setCurrentFiber(workInProgress, 'render');
            nextChildren = fn(nextProps, context);
            UmdDebugCurrentFiber$4.setCurrentFiber(workInProgress, null);
        }
        // Umd DevTools reads this flag.
        workInProgress.effectTag |= PerformedWork$1;
        reconcileChildren(current, workInProgress, nextChildren);
        memoizeProps(workInProgress, nextProps);
        return workInProgress.child;
    }

    function updateClassComponent(current, workInProgress, priorityLevel) {
        // Push context providers early to prevent context stack mismatches.
        // During mounting we don't know the child context yet as the instance doesn't exist.
        // We will invalidate the child context in finishClassComponent() right after rendering.
        var hasContext = pushContextProvider$1(workInProgress);

        var shouldUpdate = void 0;
        if (current === null) {
            if (!workInProgress.stateNode) {
                // In the initial pass we might need to construct the instance.
                constructClassInstance(workInProgress, workInProgress.pendingProps);
                mountClassInstance(workInProgress, priorityLevel);
                shouldUpdate = true;
            }
        } else {
            shouldUpdate = updateClassInstance(current, workInProgress, priorityLevel);
        }
        return finishClassComponent(current, workInProgress, shouldUpdate, hasContext);
    }

    function finishClassComponent(current, workInProgress, shouldUpdate, hasContext) {
        // Refs should update even if shouldComponentUpdate returns false
        markRef(current, workInProgress);

        if (!shouldUpdate) {
            // Context providers should defer to sCU for rendering
            if (hasContext) {
                invalidateContextProvider$1(workInProgress, false);
            }

            return bailoutOnAlreadyFinishedWork(current, workInProgress);
        }

        var instance = workInProgress.stateNode;

        // Rerender
        UmdCurrentOwner$2.current = workInProgress;
        var nextChildren = void 0;
        {
            UmdDebugCurrentFiber$4.setCurrentFiber(workInProgress, 'render');
            nextChildren = instance.render();
            UmdDebugCurrentFiber$4.setCurrentFiber(workInProgress, null);
        }
        // Umd DevTools reads this flag.
        workInProgress.effectTag |= PerformedWork$1;
        reconcileChildren(current, workInProgress, nextChildren);
        // Memoize props and state using the values we just used to render.
        // TODO: Restructure so we never read values from the instance.
        memoizeState(workInProgress, instance.state);
        memoizeProps(workInProgress, instance.props);

        // The context might have changed so we need to recalculate it.
        if (hasContext) {
            invalidateContextProvider$1(workInProgress, true);
        }

        return workInProgress.child;
    }

    function pushHostRootContext(workInProgress) {
        var root = workInProgress.stateNode;
        if (root.pendingContext) {
            pushTopLevelContextObject$1(workInProgress, root.pendingContext, root.pendingContext !== root.context);
        } else if (root.context) {
            // Should always be set
            pushTopLevelContextObject$1(workInProgress, root.context, false);
        }
        pushHostContainer(workInProgress, root.containerInfo);
    }

    function updateHostRoot(current, workInProgress, priorityLevel) {
        pushHostRootContext(workInProgress);
        var updateQueue = workInProgress.updateQueue;
        if (updateQueue !== null) {
            var prevState = workInProgress.memoizedState;
            var state = beginUpdateQueue$1(current, workInProgress, updateQueue, null, prevState, null, priorityLevel);
            if (prevState === state) {
                // If the state is the same as before, that's a bailout because we had
                // no work matching this priority.
                resetHydrationState();
                return bailoutOnAlreadyFinishedWork(current, workInProgress);
            }
            var element = state.element;
            if ((current === null || current.child === null) && enterHydrationState(workInProgress)) {
                workInProgress.effectTag |= Placement$2;
                workInProgress.child = mountChildFibersInPlace(workInProgress, workInProgress.child, element, priorityLevel);
            } else {
                // Otherwise reset hydration state in case we aborted and resumed another
                // root.
                resetHydrationState();
                reconcileChildren(current, workInProgress, element);
            }
            memoizeState(workInProgress, state);
            return workInProgress.child;
        }
        resetHydrationState();
        // If there is no update queue, that's a bailout because the root has no props.
        return bailoutOnAlreadyFinishedWork(current, workInProgress);
    }

    function updateHostComponent(current, workInProgress, renderPriority) {
        pushHostContext(workInProgress);

        if (current === null) {
            tryToClaimNextHydratableInstance(workInProgress);
        }

        var type = workInProgress.type;
        var memoizedProps = workInProgress.memoizedProps;
        var nextProps = workInProgress.pendingProps;
        if (nextProps === null) {
            nextProps = memoizedProps;
        }
        var prevProps = current !== null ? current.memoizedProps : null;

        if (hasContextChanged$1()) {
            // Normally we can bail out on props equality but if context has changed
            // we don't do the bailout and we have to reuse existing props instead.
        } else if (nextProps === null || memoizedProps === nextProps) {
            return bailoutOnAlreadyFinishedWork(current, workInProgress);
        }

        var nextChildren = nextProps.children;
        var isDirectTextChild = shouldSetTextContent(type, nextProps);

        if (isDirectTextChild) {
            // We special case a direct text child of a host node. This is a common
            // case. We won't handle it as a reified child. We will instead handle
            // this in the host environment that also have access to this prop. That
            // avoids allocating another HostText fiber and traversing it.
            nextChildren = null;
        } else if (prevProps && shouldSetTextContent(type, prevProps)) {
            // If we're switching from a direct text child to a normal child, or to
            // empty, we need to schedule the text content to be reset.
            workInProgress.effectTag |= ContentReset$1;
        }

        markRef(current, workInProgress);

        // Check the host config to see if the children are offscreen/hidden.
        if (renderPriority !== OffscreenPriority$1 && !useSyncScheduling && shouldDeprioritizeSubtree(type, nextProps)) {
            // Down-prioritize the children.
            workInProgress.pendingWorkPriority = OffscreenPriority$1;
            // Bailout and come back to this fiber later at OffscreenPriority.
            return null;
        }

        reconcileChildren(current, workInProgress, nextChildren);
        memoizeProps(workInProgress, nextProps);
        return workInProgress.child;
    }

    function updateHostText(current, workInProgress) {
        if (current === null) {
            tryToClaimNextHydratableInstance(workInProgress);
        }
        var nextProps = workInProgress.pendingProps;
        if (nextProps === null) {
            nextProps = workInProgress.memoizedProps;
        }
        memoizeProps(workInProgress, nextProps);
        // Nothing to do here. This is terminal. We'll do the completion step
        // immediately after.
        return null;
    }

    function mountIndeterminateComponent(current, workInProgress, priorityLevel) {
        var fn = workInProgress.type;
        var props = workInProgress.pendingProps;
        var unmaskedContext = getUnmaskedContext$1(workInProgress);
        var context = getMaskedContext$1(workInProgress, unmaskedContext);

        var value;

        {
            UmdCurrentOwner$2.current = workInProgress;
            value = fn(props, context);
        }
        // Umd DevTools reads this flag.
        workInProgress.effectTag |= PerformedWork$1;

        if (typeof value === 'object' && value !== null && typeof value.render === 'function') {
            // Proceed under the assumption that this is a class instance
            workInProgress.tag = ClassComponent$6;

            // Push context providers early to prevent context stack mismatches.
            // During mounting we don't know the child context yet as the instance doesn't exist.
            // We will invalidate the child context in finishClassComponent() right after rendering.
            var hasContext = pushContextProvider$1(workInProgress);
            adoptClassInstance(workInProgress, value);
            mountClassInstance(workInProgress, priorityLevel);
            return finishClassComponent(current, workInProgress, true, hasContext);
        } else {
            // Proceed under the assumption that this is a functional component
            workInProgress.tag = FunctionalComponent$1;
            {
                var Component = workInProgress.type;


                if (workInProgress.ref !== null) {
                    var info = '';
                    var ownerName = UmdDebugCurrentFiber$4.getCurrentFiberOwnerName();
                    if (ownerName) {
                        info += '\n\nCheck the render method of `' + ownerName + '`.';
                    }

                    var warningKey = ownerName || workInProgress._debugID || '';
                    var debugSource = workInProgress._debugSource;
                    if (debugSource) {
                        warningKey = debugSource.fileName + ':' + debugSource.lineNumber;
                    }
                    if (!warnedAboutStatelessRefs[warningKey]) {
                        warnedAboutStatelessRefs[warningKey] = true;
                    }
                }
            }
            reconcileChildren(current, workInProgress, value);
            memoizeProps(workInProgress, props);
            return workInProgress.child;
        }
    }

    function updateCoroutineComponent(current, workInProgress) {
        var nextCoroutine = workInProgress.pendingProps;
        if (hasContextChanged$1()) {
            // Normally we can bail out on props equality but if context has changed
            // we don't do the bailout and we have to reuse existing props instead.
            if (nextCoroutine === null) {
                nextCoroutine = current && current.memoizedProps;
            }
        } else if (nextCoroutine === null || workInProgress.memoizedProps === nextCoroutine) {
            nextCoroutine = workInProgress.memoizedProps;
            // TODO: When bailing out, we might need to return the stateNode instead
            // of the child. To check it for work.
            // return bailoutOnAlreadyFinishedWork(current, workInProgress);
        }

        var nextChildren = nextCoroutine.children;
        var priorityLevel = workInProgress.pendingWorkPriority;

        // The following is a fork of reconcileChildrenAtPriority but using
        // stateNode to store the child.
        if (current === null) {
            workInProgress.stateNode = mountChildFibersInPlace(workInProgress, workInProgress.stateNode, nextChildren, priorityLevel);
        } else if (current.child === workInProgress.child) {
            workInProgress.stateNode = reconcileChildFibers(workInProgress, workInProgress.stateNode, nextChildren, priorityLevel);
        } else {
            workInProgress.stateNode = reconcileChildFibersInPlace(workInProgress, workInProgress.stateNode, nextChildren, priorityLevel);
        }

        memoizeProps(workInProgress, nextCoroutine);
        // This doesn't take arbitrary time so we could synchronously just begin
        // eagerly do the work of workInProgress.child as an optimization.
        return workInProgress.stateNode;
    }

    function updatePortalComponent(current, workInProgress) {
        pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
        var priorityLevel = workInProgress.pendingWorkPriority;
        var nextChildren = workInProgress.pendingProps;
        if (hasContextChanged$1()) {
            // Normally we can bail out on props equality but if context has changed
            // we don't do the bailout and we have to reuse existing props instead.
            if (nextChildren === null) {
                nextChildren = current && current.memoizedProps;
            }
        } else if (nextChildren === null || workInProgress.memoizedProps === nextChildren) {
            return bailoutOnAlreadyFinishedWork(current, workInProgress);
        }

        if (current === null) {
            // Portals are special because we don't append the children during mount
            // but at commit. Therefore we need to track insertions which the normal
            // flow doesn't do during mount. This doesn't happen at the root because
            // the root always starts with a "current" with a null child.
            // TODO: Consider unifying this with how the root works.
            workInProgress.child = reconcileChildFibersInPlace(workInProgress, workInProgress.child, nextChildren, priorityLevel);
            memoizeProps(workInProgress, nextChildren);
        } else {
            reconcileChildren(current, workInProgress, nextChildren);
            memoizeProps(workInProgress, nextChildren);
        }
        return workInProgress.child;
    }

    /*
    function reuseChildrenEffects(returnFiber : Fiber, firstChild : Fiber) {
      let child = firstChild;
      do {
        // Ensure that the first and last effect of the parent corresponds
        // to the children's first and last effect.
        if (!returnFiber.firstEffect) {
          returnFiber.firstEffect = child.firstEffect;
        }
        if (child.lastEffect) {
          if (returnFiber.lastEffect) {
            returnFiber.lastEffect.nextEffect = child.firstEffect;
          }
          returnFiber.lastEffect = child.lastEffect;
        }
      } while (child = child.sibling);
    }
    */

    function bailoutOnAlreadyFinishedWork(current, workInProgress) {
        {
            cancelWorkTimer(workInProgress);
        }

        // TODO: We should ideally be able to bail out early if the children have no
        // more work to do. However, since we don't have a separation of this
        // Fiber's priority and its children yet - we don't know without doing lots
        // of the same work we do anyway. Once we have that separation we can just
        // bail out here if the children has no more work at this priority level.
        // if (workInProgress.priorityOfChildren <= priorityLevel) {
        //   // If there are side-effects in these children that have not yet been
        //   // committed we need to ensure that they get properly transferred up.
        //   if (current && current.child !== workInProgress.child) {
        //     reuseChildrenEffects(workInProgress, child);
        //   }
        //   return null;
        // }

        cloneChildFibers(current, workInProgress);
        return workInProgress.child;
    }

    function bailoutOnLowPriority(current, workInProgress) {
        {
            cancelWorkTimer(workInProgress);
        }

        // TODO: Handle HostComponent tags here as well and call pushHostContext()?
        // See PR 8590 discussion for context
        switch (workInProgress.tag) {
            case HostRoot$7:
                pushHostRootContext(workInProgress);
                break;
            case ClassComponent$6:
                pushContextProvider$1(workInProgress);
                break;
            case HostPortal$4:
                pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
                break;
        }
        // TODO: What if this is currently in progress?
        // How can that happen? How is this not being cloned?
        return null;
    }

    // TODO: Delete memoizeProps/State and move to reconcile/bailout instead
    function memoizeProps(workInProgress, nextProps) {
        workInProgress.memoizedProps = nextProps;
    }

    function memoizeState(workInProgress, nextState) {
        workInProgress.memoizedState = nextState;
        // Don't reset the updateQueue, in case there are pending updates. Resetting
        // is handled by beginUpdateQueue.
    }

    function beginWork(current, workInProgress, priorityLevel) {
        if (workInProgress.pendingWorkPriority === NoWork$3 || workInProgress.pendingWorkPriority > priorityLevel) {
            return bailoutOnLowPriority(current, workInProgress);
        }

        {
            UmdDebugCurrentFiber$4.setCurrentFiber(workInProgress, null);
        }

        switch (workInProgress.tag) {
            case IndeterminateComponent$2:
                return mountIndeterminateComponent(current, workInProgress, priorityLevel);
            case FunctionalComponent$1:
                return updateFunctionalComponent(current, workInProgress);
            case ClassComponent$6:
                return updateClassComponent(current, workInProgress, priorityLevel);
            case HostRoot$7:
                return updateHostRoot(current, workInProgress, priorityLevel);
            case HostComponent$7:
                return updateHostComponent(current, workInProgress, priorityLevel);
            case HostText$4:
                return updateHostText(current, workInProgress);
            case CoroutineHandlerPhase:
                // This is a restart. Reset the tag to the initial phase.
                workInProgress.tag = CoroutineComponent$1;
            // Intentionally fall through since this is now the same.
            case CoroutineComponent$1:
                return updateCoroutineComponent(current, workInProgress);
            case YieldComponent$2:
                // A yield component is just a placeholder, we can just run through the
                // next one immediately.
                return null;
            case HostPortal$4:
                return updatePortalComponent(current, workInProgress);
            case Fragment$2:
                return updateFragment(current, workInProgress);
            default:
                break;
        }
    }

    function beginFailedWork(current, workInProgress, priorityLevel) {
        // Push context providers here to avoid a push/pop context mismatch.
        switch (workInProgress.tag) {
            case ClassComponent$6:
                pushContextProvider$1(workInProgress);
                break;
            case HostRoot$7:
                pushHostRootContext(workInProgress);
                break;
            default:
                break;
        }

        // Add an error effect so we can handle the error during the commit phase
        workInProgress.effectTag |= Err$1;

        // This is a weird case where we do "resume" work — work that failed on
        // our first attempt. Because we no longer have a notion of "progressed
        // deletions," reset the child to the current child to make sure we delete
        // it again. TODO: Find a better way to handle this, perhaps during a more
        // general overhaul of error handling.
        if (current === null) {
            workInProgress.child = null;
        } else if (workInProgress.child !== current.child) {
            workInProgress.child = current.child;
        }

        if (workInProgress.pendingWorkPriority === NoWork$3 || workInProgress.pendingWorkPriority > priorityLevel) {
            return bailoutOnLowPriority(current, workInProgress);
        }

        // If we don't bail out, we're going be recomputing our children so we need
        // to drop our effect list.
        workInProgress.firstEffect = null;
        workInProgress.lastEffect = null;

        // Unmount the current children as if the component rendered null
        var nextChildren = null;
        reconcileChildrenAtPriority(current, workInProgress, nextChildren, priorityLevel);

        if (workInProgress.tag === ClassComponent$6) {
            var instance = workInProgress.stateNode;
            workInProgress.memoizedProps = instance.props;
            workInProgress.memoizedState = instance.state;
        }

        return workInProgress.child;
    }

    return {
        beginWork: beginWork,
        beginFailedWork: beginFailedWork
    };
};

var reconcileChildFibers$2 = UmdChildFiber.reconcileChildFibers;

var popContextProvider$2 = UmdFiberContext.popContextProvider;
var popTopLevelContextObject$1 = UmdFiberContext.popTopLevelContextObject;




var IndeterminateComponent$3 = UmdTypeOfWork.IndeterminateComponent;
var FunctionalComponent$3 = UmdTypeOfWork.FunctionalComponent;
var ClassComponent$8 = UmdTypeOfWork.ClassComponent;
var HostRoot$8 = UmdTypeOfWork.HostRoot;
var HostComponent$8 = UmdTypeOfWork.HostComponent;
var HostText$6 = UmdTypeOfWork.HostText;
var HostPortal$6 = UmdTypeOfWork.HostPortal;
var CoroutineComponent$3 = UmdTypeOfWork.CoroutineComponent;
var CoroutineHandlerPhase$1 = UmdTypeOfWork.CoroutineHandlerPhase;
var YieldComponent$4 = UmdTypeOfWork.YieldComponent;
var Fragment$4 = UmdTypeOfWork.Fragment;
var Placement$4 = UmdTypeOfSideEffect.Placement;
var Ref$2 = UmdTypeOfSideEffect.Ref;
var Update$2 = UmdTypeOfSideEffect.Update;
var OffscreenPriority$2 = UmdPriorityLevel.OffscreenPriority;


{
    var UmdDebugCurrentFiber$5 = UmdDebugCurrentFiber_1;
}



var UmdFiberCompleteWork = function (config, hostContext, hydrationContext) {
    var createInstance = config.createInstance,
        createTextInstance = config.createTextInstance,
        appendInitialChild = config.appendInitialChild,
        finalizeInitialChildren = config.finalizeInitialChildren,
        prepareUpdate = config.prepareUpdate;
    var getRootHostContainer = hostContext.getRootHostContainer,
        popHostContext = hostContext.popHostContext,
        getHostContext = hostContext.getHostContext,
        popHostContainer = hostContext.popHostContainer;
    var prepareToHydrateHostInstance = hydrationContext.prepareToHydrateHostInstance,
        prepareToHydrateHostTextInstance = hydrationContext.prepareToHydrateHostTextInstance,
        popHydrationState = hydrationContext.popHydrationState;


    function markUpdate(workInProgress) {
        // Tag the fiber with an update effect. This turns a Placement into
        // an UpdateAndPlacement.
        workInProgress.effectTag |= Update$2;
    }

    function markRef(workInProgress) {
        workInProgress.effectTag |= Ref$2;
    }

    function appendAllYields(yields, workInProgress) {
        var node = workInProgress.stateNode;
        if (node) {
            node['return'] = workInProgress;
        }
        while (node !== null) {
            if (node.tag === YieldComponent$4) {
                yields.push(node.type);
            } else if (node.child !== null) {
                node.child['return'] = node;
                node = node.child;
                continue;
            }
            while (node.sibling === null) {
                if (node['return'] === null || node['return'] === workInProgress) {
                    return;
                }
                node = node['return'];
            }
            node.sibling['return'] = node['return'];
            node = node.sibling;
        }
    }

    function moveCoroutineToHandlerPhase(current, workInProgress) {
        var coroutine = workInProgress.memoizedProps;

        // First step of the coroutine has completed. Now we need to do the second.
        // TODO: It would be nice to have a multi stage coroutine represented by a
        // single component, or at least tail call optimize nested ones. Currently
        // that requires additional fields that we don't want to add to the fiber.
        // So this requires nested handlers.
        // Note: This doesn't mutate the alternate node. I don't think it needs to
        // since this stage is reset for every pass.
        workInProgress.tag = CoroutineHandlerPhase$1;

        // Build up the yields.
        // TODO: Compare this to a generator or opaque helpers like Children.
        var yields = [];
        appendAllYields(yields, workInProgress);
        var fn = coroutine.handler;
        var props = coroutine.props;
        var nextChildren = fn(props, yields);

        var currentFirstChild = current !== null ? current.child : null;
        // Inherit the priority of the returnFiber.
        var priority = workInProgress.pendingWorkPriority;
        workInProgress.child = reconcileChildFibers$2(workInProgress, currentFirstChild, nextChildren, priority);
        return workInProgress.child;
    }

    function appendAllChildren(parent, workInProgress) {
        // We only have the top Fiber that was created but we need recurse down its
        // children to find all the terminal nodes.
        var node = workInProgress.child;
        while (node !== null) {
            if (node.tag === HostComponent$8 || node.tag === HostText$6) {
                appendInitialChild(parent, node.stateNode);
            } else if (node.tag === HostPortal$6) {
                // If we have a portal child, then we don't want to traverse
                // down its children. Instead, we'll get insertions from each child in
                // the portal directly.
            } else if (node.child !== null) {
                node = node.child;
                continue;
            }
            if (node === workInProgress) {
                return;
            }
            while (node.sibling === null) {
                if (node['return'] === null || node['return'] === workInProgress) {
                    return;
                }
                node = node['return'];
            }
            node = node.sibling;
        }
    }

    function completeWork(current, workInProgress, renderPriority) {
        {
            UmdDebugCurrentFiber$5.setCurrentFiber(workInProgress, null);
        }

        // Get the latest props.
        var newProps = workInProgress.pendingProps;
        if (newProps === null) {
            newProps = workInProgress.memoizedProps;
        } else if (workInProgress.pendingWorkPriority !== OffscreenPriority$2 || renderPriority === OffscreenPriority$2) {
            // Reset the pending props, unless this was a down-prioritization.
            workInProgress.pendingProps = null;
        }

        switch (workInProgress.tag) {
            case FunctionalComponent$3:
                return null;
            case ClassComponent$8:
                {
                    // We are leaving this subtree, so pop context if any.
                    popContextProvider$2(workInProgress);
                    return null;
                }
            case HostRoot$8:
                {
                    popHostContainer(workInProgress);
                    popTopLevelContextObject$1(workInProgress);
                    var fiberRoot = workInProgress.stateNode;
                    if (fiberRoot.pendingContext) {
                        fiberRoot.context = fiberRoot.pendingContext;
                        fiberRoot.pendingContext = null;
                    }

                    if (current === null || current.child === null) {
                        // If we hydrated, pop so that we can delete any remaining children
                        // that weren't hydrated.
                        popHydrationState(workInProgress);
                        // This resets the hacky state to fix isMounted before committing.
                        // TODO: Delete this when we delete isMounted and findDOMNode.
                        workInProgress.effectTag &= ~Placement$4;
                    }
                    return null;
                }
            case HostComponent$8:
                {
                    popHostContext(workInProgress);
                    var rootContainerInstance = getRootHostContainer();
                    var type = workInProgress.type;
                    if (current !== null && workInProgress.stateNode != null) {
                        // If we have an alternate, that means this is an update and we need to
                        // schedule a side-effect to do the updates.
                        var oldProps = current.memoizedProps;
                        // If we get updated because one of our children updated, we don't
                        // have newProps so we'll have to reuse them.
                        // TODO: Split the update API as separate for the props vs. children.
                        // Even better would be if children weren't special cased at all tho.
                        var instance = workInProgress.stateNode;
                        var currentHostContext = getHostContext();
                        var updatePayload = prepareUpdate(instance, type, oldProps, newProps, rootContainerInstance, currentHostContext);

                        // TODO: Type this specific to this type of component.
                        workInProgress.updateQueue = updatePayload;
                        // If the update payload indicates that there is a change or if there
                        // is a new ref we mark this as an update.
                        if (updatePayload) {
                            markUpdate(workInProgress);
                        }
                        if (current.ref !== workInProgress.ref) {
                            markRef(workInProgress);
                        }
                    } else {
                        if (!newProps) {
                            // This can happen when we abort work.
                            return null;
                        }

                        var _currentHostContext = getHostContext();
                        // TODO: Move createInstance to beginWork and keep it on a context
                        // "stack" as the parent. Then append children as we go in beginWork
                        // or completeWork depending on we want to add then top->down or
                        // bottom->up. Top->down is faster in IE11.
                        var wasHydrated = popHydrationState(workInProgress);
                        if (wasHydrated) {
                            // TOOD: Move this and createInstance step into the beginPhase
                            // to consolidate.
                            if (prepareToHydrateHostInstance(workInProgress, rootContainerInstance, _currentHostContext)) {
                                // If changes to the hydrated node needs to be applied at the
                                // commit-phase we mark this as such.
                                markUpdate(workInProgress);
                            }
                        } else {
                            var _instance = createInstance(type, newProps, rootContainerInstance, _currentHostContext, workInProgress);

                            appendAllChildren(_instance, workInProgress);

                            // Certain renderers require commit-time effects for initial mount.
                            // (eg DOM renderer supports auto-focus for certain elements).
                            // Make sure such renderers get scheduled for later work.
                            if (finalizeInitialChildren(_instance, type, newProps, rootContainerInstance)) {
                                markUpdate(workInProgress);
                            }
                            workInProgress.stateNode = _instance;
                        }

                        if (workInProgress.ref !== null) {
                            // If there is a ref on a host node we need to schedule a callback
                            markRef(workInProgress);
                        }
                    }
                    return null;
                }
            case HostText$6:
                {
                    var newText = newProps;
                    if (current && workInProgress.stateNode != null) {
                        var oldText = current.memoizedProps;
                        // If we have an alternate, that means this is an update and we need
                        // to schedule a side-effect to do the updates.
                        if (oldText !== newText) {
                            markUpdate(workInProgress);
                        }
                    } else {
                        if (typeof newText !== 'string') {
                            // This can happen when we abort work.
                            return null;
                        }
                        var _rootContainerInstance = getRootHostContainer();
                        var _currentHostContext2 = getHostContext();
                        var _wasHydrated = popHydrationState(workInProgress);
                        if (_wasHydrated) {
                            if (prepareToHydrateHostTextInstance(workInProgress)) {
                                markUpdate(workInProgress);
                            }
                        } else {
                            workInProgress.stateNode = createTextInstance(newText, _rootContainerInstance, _currentHostContext2, workInProgress);
                        }
                    }
                    return null;
                }
            case CoroutineComponent$3:
                return moveCoroutineToHandlerPhase(current, workInProgress);
            case CoroutineHandlerPhase$1:
                // Reset the tag to now be a first phase coroutine.
                workInProgress.tag = CoroutineComponent$3;
                return null;
            case YieldComponent$4:
                // Does nothing.
                return null;
            case Fragment$4:
                return null;
            case HostPortal$6:
                // TODO: Only mark this as an update if we have any pending callbacks.
                markUpdate(workInProgress);
                popHostContainer(workInProgress);
                return null;
            // Error cases
            case IndeterminateComponent$3:
            // eslint-disable-next-line no-fallthrough
            default:
                break;
        }
    }

    return {
        completeWork: completeWork
    };
};


var onCommitFiberRoot = null;
var onCommitFiberUnmount = null;
var hasLoggedError = false;

function catchErrors(fn) {
    return function (arg) {
        try {
            return fn(arg);
        } catch (err) {
            if (true && !hasLoggedError) {
                hasLoggedError = true;
            }
        }
    };
}

function injectInternals$1(internals) {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
        // No DevTools
        return false;
    }
    var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook.supportsFiber) {

        return true;
    }
    try {
        var rendererID = hook.inject(internals);
        // We have successfully injected, so now it is safe to set up hooks.
        onCommitFiberRoot = catchErrors(function (root) {
            return hook.onCommitFiberRoot(rendererID, root);
        });
        onCommitFiberUnmount = catchErrors(function (fiber) {
            return hook.onCommitFiberUnmount(rendererID, fiber);
        });
    } catch (err) {

    }
    // DevTools exists
    return true;
}

function onCommitRoot$1(root) {
    if (typeof onCommitFiberRoot === 'function') {
        onCommitFiberRoot(root);
    }
}

function onCommitUnmount$1(fiber) {
    if (typeof onCommitFiberUnmount === 'function') {
        onCommitFiberUnmount(fiber);
    }
}

var injectInternals_1 = injectInternals$1;
var onCommitRoot_1 = onCommitRoot$1;
var onCommitUnmount_1 = onCommitUnmount$1;

var UmdFiberDevToolsHook = {
    injectInternals: injectInternals_1,
    onCommitRoot: onCommitRoot_1,
    onCommitUnmount: onCommitUnmount_1
};

var ClassComponent$9 = UmdTypeOfWork.ClassComponent;
var HostRoot$9 = UmdTypeOfWork.HostRoot;
var HostComponent$9 = UmdTypeOfWork.HostComponent;
var HostText$7 = UmdTypeOfWork.HostText;
var HostPortal$7 = UmdTypeOfWork.HostPortal;
var CoroutineComponent$4 = UmdTypeOfWork.CoroutineComponent;

var commitCallbacks$1 = UmdFiberUpdateQueue.commitCallbacks;

var onCommitUnmount = UmdFiberDevToolsHook.onCommitUnmount;

var invokeGuardedCallback$2 = UmdErrorUtils_1.invokeGuardedCallback;
var hasCaughtError$1 = UmdErrorUtils_1.hasCaughtError;
var clearCaughtError$1 = UmdErrorUtils_1.clearCaughtError;

var Placement$5 = UmdTypeOfSideEffect.Placement;
var Update$3 = UmdTypeOfSideEffect.Update;
var Callback$1 = UmdTypeOfSideEffect.Callback;
var ContentReset$2 = UmdTypeOfSideEffect.ContentReset;



{
    var _require5$1 = UmdDebugFiberPerf_1,
        startPhaseTimer$2 = _require5$1.startPhaseTimer,
        stopPhaseTimer$2 = _require5$1.stopPhaseTimer;
}

var UmdFiberCommitWork = function (config, captureError) {
    var commitMount = config.commitMount,
        commitUpdate = config.commitUpdate,
        resetTextContent = config.resetTextContent,
        commitTextUpdate = config.commitTextUpdate,
        appendChild = config.appendChild,
        appendChildToContainer = config.appendChildToContainer,
        insertBefore = config.insertBefore,
        insertInContainerBefore = config.insertInContainerBefore,
        removeChild = config.removeChild,
        removeChildFromContainer = config.removeChildFromContainer,
        getPublicInstance = config.getPublicInstance;


    {
        var callComponentWillUnmountWithTimerInDev = function (current, instance) {
            startPhaseTimer$2(current, 'componentWillUnmount');
            instance.props = current.memoizedProps;
            instance.state = current.memoizedState;
            instance.componentWillUnmount();
            stopPhaseTimer$2();
        };
    }

    // Capture errors so they don't interrupt unmounting.
    function safelyCallComponentWillUnmount(current, instance) {
        {
            invokeGuardedCallback$2(null, callComponentWillUnmountWithTimerInDev, null, current, instance);
            if (hasCaughtError$1()) {
                var unmountError = clearCaughtError$1();
                captureError(current, unmountError);
            }
        }
    }

    function safelyDetachRef(current) {
        var ref = current.ref;
        if (ref !== null) {
            {
                invokeGuardedCallback$2(null, ref, null, null);
                if (hasCaughtError$1()) {
                    var refError = clearCaughtError$1();
                    captureError(current, refError);
                }
            }
        }
    }

    function getHostParentFiber(fiber) {
        var parent = fiber['return'];
        while (parent !== null) {
            if (isHostParent(parent)) {
                return parent;
            }
            parent = parent['return'];
        }
    }

    function isHostParent(fiber) {
        return fiber.tag === HostComponent$9 || fiber.tag === HostRoot$9 || fiber.tag === HostPortal$7;
    }

    function getHostSibling(fiber) {
        // We're going to search forward into the tree until we find a sibling host
        // node. Unfortunately, if multiple insertions are done in a row we have to
        // search past them. This leads to exponential search for the next sibling.
        var node = fiber;
        siblings: while (true) {
            // If we didn't find anything, let's try the next sibling.
            while (node.sibling === null) {
                if (node['return'] === null || isHostParent(node['return'])) {
                    // If we pop out of the root or hit the parent the fiber we are the
                    // last sibling.
                    return null;
                }
                node = node['return'];
            }
            node.sibling['return'] = node['return'];
            node = node.sibling;
            while (node.tag !== HostComponent$9 && node.tag !== HostText$7) {
                // If it is not host node and, we might have a host node inside it.
                // Try to search down until we find one.
                if (node.effectTag & Placement$5) {
                    // If we don't have a child, try the siblings instead.
                    continue siblings;
                }
                // If we don't have a child, try the siblings instead.
                // We also skip portals because they are not part of this host tree.
                if (node.child === null || node.tag === HostPortal$7) {
                    continue siblings;
                } else {
                    node.child['return'] = node;
                    node = node.child;
                }
            }
            // Check if this host node is stable or about to be placed.
            if (!(node.effectTag & Placement$5)) {
                // Found it!
                return node.stateNode;
            }
        }
    }

    function commitPlacement(finishedWork) {
        // Recursively insert all host nodes into the parent.
        var parentFiber = getHostParentFiber(finishedWork);
        var parent = void 0;
        var isContainer = void 0;
        switch (parentFiber.tag) {
            case HostComponent$9:
                parent = parentFiber.stateNode;
                isContainer = false;
                break;
            case HostRoot$9:
                parent = parentFiber.stateNode.containerInfo;
                isContainer = true;
                break;
            case HostPortal$7:
                parent = parentFiber.stateNode.containerInfo;
                isContainer = true;
                break;
            default:
                break;
        }
        if (parentFiber.effectTag & ContentReset$2) {
            // Reset the text content of the parent before doing any insertions
            resetTextContent(parent);
            // Clear ContentReset from the effect tag
            parentFiber.effectTag &= ~ContentReset$2;
        }

        var before = getHostSibling(finishedWork);
        // We only have the top Fiber that was inserted but we need recurse down its
        // children to find all the terminal nodes.
        var node = finishedWork;
        while (true) {
            if (node.tag === HostComponent$9 || node.tag === HostText$7) {
                if (before) {
                    if (isContainer) {
                        insertInContainerBefore(parent, node.stateNode, before);
                    } else {
                        insertBefore(parent, node.stateNode, before);
                    }
                } else {
                    if (isContainer) {
                        appendChildToContainer(parent, node.stateNode);
                    } else {
                        appendChild(parent, node.stateNode);
                    }
                }
            } else if (node.tag === HostPortal$7) {
                // If the insertion itself is a portal, then we don't want to traverse
                // down its children. Instead, we'll get insertions from each child in
                // the portal directly.
            } else if (node.child !== null) {
                node.child['return'] = node;
                node = node.child;
                continue;
            }
            if (node === finishedWork) {
                return;
            }
            while (node.sibling === null) {
                if (node['return'] === null || node['return'] === finishedWork) {
                    return;
                }
                node = node['return'];
            }
            node.sibling['return'] = node['return'];
            node = node.sibling;
        }
    }

    function commitNestedUnmounts(root) {
        // While we're inside a removed host node we don't want to call
        // removeChild on the inner nodes because they're removed by the top
        // call anyway. We also want to call componentWillUnmount on all
        // composites before this host node is removed from the tree. Therefore
        var node = root;
        while (true) {
            commitUnmount(node);
            // Visit children because they may contain more composite or host nodes.
            // Skip portals because commitUnmount() currently visits them recursively.
            if (node.child !== null && node.tag !== HostPortal$7) {
                node.child['return'] = node;
                node = node.child;
                continue;
            }
            if (node === root) {
                return;
            }
            while (node.sibling === null) {
                if (node['return'] === null || node['return'] === root) {
                    return;
                }
                node = node['return'];
            }
            node.sibling['return'] = node['return'];
            node = node.sibling;
        }
    }

    function unmountHostComponents(current) {
        // We only have the top Fiber that was inserted but we need recurse down its
        var node = current;

        // Each iteration, currentParent is populated with node's host parent if not
        // currentParentIsValid.
        var currentParentIsValid = false;
        var currentParent = void 0;
        var currentParentIsContainer = void 0;

        while (true) {
            if (!currentParentIsValid) {
                var parent = node['return'];
                findParent: while (true) {
                    switch (parent.tag) {
                        case HostComponent$9:
                            currentParent = parent.stateNode;
                            currentParentIsContainer = false;
                            break findParent;
                        case HostRoot$9:
                            currentParent = parent.stateNode.containerInfo;
                            currentParentIsContainer = true;
                            break findParent;
                        case HostPortal$7:
                            currentParent = parent.stateNode.containerInfo;
                            currentParentIsContainer = true;
                            break findParent;
                    }
                    parent = parent['return'];
                }
                currentParentIsValid = true;
            }

            if (node.tag === HostComponent$9 || node.tag === HostText$7) {
                commitNestedUnmounts(node);
                // After all the children have unmounted, it is now safe to remove the
                // node from the tree.
                if (currentParentIsContainer) {
                    removeChildFromContainer(currentParent, node.stateNode);
                } else {
                    removeChild(currentParent, node.stateNode);
                }
                // Don't visit children because we already visited them.
            } else if (node.tag === HostPortal$7) {
                // When we go into a portal, it becomes the parent to remove from.
                // We will reassign it back when we pop the portal on the way up.
                currentParent = node.stateNode.containerInfo;
                // Visit children because portals might contain host components.
                if (node.child !== null) {
                    node.child['return'] = node;
                    node = node.child;
                    continue;
                }
            } else {
                commitUnmount(node);
                // Visit children because we may find more host components below.
                if (node.child !== null) {
                    node.child['return'] = node;
                    node = node.child;
                    continue;
                }
            }
            if (node === current) {
                return;
            }
            while (node.sibling === null) {
                if (node['return'] === null || node['return'] === current) {
                    return;
                }
                node = node['return'];
                if (node.tag === HostPortal$7) {
                    // When we go out of the portal, we need to restore the parent.
                    // Since we don't keep a stack of them, we will search for it.
                    currentParentIsValid = false;
                }
            }
            node.sibling['return'] = node['return'];
            node = node.sibling;
        }
    }

    function commitDeletion(current) {
        // Recursively delete all host nodes from the parent.
        // Detach refs and call componentWillUnmount() on the whole subtree.
        unmountHostComponents(current);

        // Cut off the return pointers to disconnect it from the tree. Ideally, we
        // should clear the child pointer of the parent alternate to let this
        // get GC:ed but we don't know which for sure which parent is the current
        // one so we'll settle for GC:ing the subtree of this child. This child
        // itself will be GC:ed when the parent updates the next time.
        current['return'] = null;
        current.child = null;
        if (current.alternate) {
            current.alternate.child = null;
            current.alternate['return'] = null;
        }
    }

    // User-originating errors (lifecycles and refs) should not interrupt
    // deletion, so don't let them throw. Host-originating errors should
    // interrupt deletion, so it's okay
    function commitUnmount(current) {
        if (typeof onCommitUnmount === 'function') {
            onCommitUnmount(current);
        }

        switch (current.tag) {
            case ClassComponent$9:
                {
                    safelyDetachRef(current);
                    var instance = current.stateNode;
                    if (typeof instance.componentWillUnmount === 'function') {
                        safelyCallComponentWillUnmount(current, instance);
                    }
                    return;
                }
            case HostComponent$9:
                {
                    safelyDetachRef(current);
                    return;
                }
            case CoroutineComponent$4:
                {
                    commitNestedUnmounts(current.stateNode);
                    return;
                }
            case HostPortal$7:
                {
                    // TODO: this is recursive.
                    // We are also not using this parent because
                    // the portal will get pushed immediately.
                    unmountHostComponents(current);
                    return;
                }
        }
    }

    function commitWork(current, finishedWork) {
        switch (finishedWork.tag) {
            case ClassComponent$9:
                {
                    return;
                }
            case HostComponent$9:
                {
                    var instance = finishedWork.stateNode;
                    if (instance != null) {
                        // Commit the work prepared earlier.
                        var newProps = finishedWork.memoizedProps;
                        // For hydration we reuse the update path but we treat the oldProps
                        // as the newProps. The updatePayload will contain the real change in
                        // this case.
                        var oldProps = current !== null ? current.memoizedProps : newProps;
                        var type = finishedWork.type;
                        // TODO: Type the updateQueue to be specific to host components.
                        var updatePayload = finishedWork.updateQueue;
                        finishedWork.updateQueue = null;
                        if (updatePayload !== null) {
                            commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork);
                        }
                    }
                    return;
                }
            case HostText$7:
                {
                    var textInstance = finishedWork.stateNode;
                    var newText = finishedWork.memoizedProps;
                    // For hydration we reuse the update path but we treat the oldProps
                    // as the newProps. The updatePayload will contain the real change in
                    // this case.
                    var oldText = current !== null ? current.memoizedProps : newText;
                    commitTextUpdate(textInstance, oldText, newText);
                    return;
                }
            case HostRoot$9:
                {
                    return;
                }
            case HostPortal$7:
                {
                    return;
                }
            default:
                break;
        }
    }

    function commitLifeCycles(current, finishedWork) {
        switch (finishedWork.tag) {
            case ClassComponent$9:
                {
                    var instance = finishedWork.stateNode;
                    if (finishedWork.effectTag & Update$3) {
                        if (current === null) {
                            {
                                startPhaseTimer$2(finishedWork, 'componentDidMount');
                            }
                            instance.props = finishedWork.memoizedProps;
                            instance.state = finishedWork.memoizedState;
                            instance.componentDidMount();
                            {
                                stopPhaseTimer$2();
                            }
                        } else {
                            var prevProps = current.memoizedProps;
                            var prevState = current.memoizedState;
                            {
                                startPhaseTimer$2(finishedWork, 'componentDidUpdate');
                            }
                            instance.props = finishedWork.memoizedProps;
                            instance.state = finishedWork.memoizedState;
                            instance.componentDidUpdate(prevProps, prevState);
                            {
                                stopPhaseTimer$2();
                            }
                        }
                    }
                    if (finishedWork.effectTag & Callback$1 && finishedWork.updateQueue !== null) {
                        commitCallbacks$1(finishedWork, finishedWork.updateQueue, instance);
                    }
                    return;
                }
            case HostRoot$9:
                {
                    var updateQueue = finishedWork.updateQueue;
                    if (updateQueue !== null) {
                        var _instance = finishedWork.child && finishedWork.child.stateNode;
                        commitCallbacks$1(finishedWork, updateQueue, _instance);
                    }
                    return;
                }
            case HostComponent$9:
                {
                    var _instance2 = finishedWork.stateNode;

                    // Renderers may schedule work to be done after host components are mounted
                    // (eg DOM renderer may schedule auto-focus for inputs and form controls).
                    // These effects should only be committed when components are first mounted,
                    // aka when there is no current/alternate.
                    if (current === null && finishedWork.effectTag & Update$3) {
                        var type = finishedWork.type;
                        var props = finishedWork.memoizedProps;
                        commitMount(_instance2, type, props, finishedWork);
                    }

                    return;
                }
            case HostText$7:
                {
                    // We have no life-cycles associated with text.
                    return;
                }
            case HostPortal$7:
                {
                    // We have no life-cycles associated with portals.
                    return;
                }
            default:
                break;
        }
    }

    function commitAttachRef(finishedWork) {
        var ref = finishedWork.ref;
        if (ref !== null) {
            var instance = finishedWork.stateNode;
            switch (finishedWork.tag) {
                case HostComponent$9:
                    ref(getPublicInstance(instance));
                    break;
                default:
                    ref(instance);
            }
        }
    }

    function commitDetachRef(current) {
        var currentRef = current.ref;
        if (currentRef !== null) {
            currentRef(null);
        }
    }

    return {
        commitPlacement: commitPlacement,
        commitDeletion: commitDeletion,
        commitWork: commitWork,
        commitLifeCycles: commitLifeCycles,
        commitAttachRef: commitAttachRef,
        commitDetachRef: commitDetachRef
    };
};

var createCursor$2 = UmdFiberStack.createCursor;
var pop$2 = UmdFiberStack.pop;
var push$2 = UmdFiberStack.push;



var NO_CONTEXT = {};

var UmdFiberHostContext = function (config) {
    var getChildHostContext = config.getChildHostContext,
        getRootHostContext = config.getRootHostContext;


    var contextStackCursor = createCursor$2(NO_CONTEXT);
    var contextFiberStackCursor = createCursor$2(NO_CONTEXT);
    var rootInstanceStackCursor = createCursor$2(NO_CONTEXT);

    function requiredContext(c) {
        return c;
    }

    function getRootHostContainer() {
        var rootInstance = requiredContext(rootInstanceStackCursor.current);
        return rootInstance;
    }

    function pushHostContainer(fiber, nextRootInstance) {
        // Push current root instance onto the stack;
        // This allows us to reset root when portals are popped.
        push$2(rootInstanceStackCursor, nextRootInstance, fiber);

        var nextRootContext = getRootHostContext(nextRootInstance);

        // Track the context and the Fiber that provided it.
        // This enables us to pop only Fibers that provide unique contexts.
        push$2(contextFiberStackCursor, fiber, fiber);
        push$2(contextStackCursor, nextRootContext, fiber);
    }

    function popHostContainer(fiber) {
        pop$2(contextStackCursor, fiber);
        pop$2(contextFiberStackCursor, fiber);
        pop$2(rootInstanceStackCursor, fiber);
    }

    function getHostContext() {
        var context = requiredContext(contextStackCursor.current);
        return context;
    }

    function pushHostContext(fiber) {
        var rootInstance = requiredContext(rootInstanceStackCursor.current);
        var context = requiredContext(contextStackCursor.current);
        var nextContext = getChildHostContext(context, fiber.type, rootInstance);

        // Don't push this Fiber's context unless it's unique.
        if (context === nextContext) {
            return;
        }

        // Track the context and the Fiber that provided it.
        // This enables us to pop only Fibers that provide unique contexts.
        push$2(contextFiberStackCursor, fiber, fiber);
        push$2(contextStackCursor, nextContext, fiber);
    }

    function popHostContext(fiber) {
        // Do not pop unless this Fiber provided the current context.
        // pushHostContext() only pushes Fibers that provide unique contexts.
        if (contextFiberStackCursor.current !== fiber) {
            return;
        }

        pop$2(contextStackCursor, fiber);
        pop$2(contextFiberStackCursor, fiber);
    }

    function resetHostContainer() {
        contextStackCursor.current = NO_CONTEXT;
        rootInstanceStackCursor.current = NO_CONTEXT;
    }

    return {
        getHostContext: getHostContext,
        getRootHostContainer: getRootHostContainer,
        popHostContainer: popHostContainer,
        popHostContext: popHostContext,
        pushHostContainer: pushHostContainer,
        pushHostContext: pushHostContext,
        resetHostContainer: resetHostContainer
    };
};

var HostComponent$10 = UmdTypeOfWork.HostComponent;
var HostText$8 = UmdTypeOfWork.HostText;
var HostRoot$10 = UmdTypeOfWork.HostRoot;

var Deletion$2 = UmdTypeOfSideEffect.Deletion;
var Placement$6 = UmdTypeOfSideEffect.Placement;

var createFiberFromHostInstanceForDeletion$1 = UmdFiber.createFiberFromHostInstanceForDeletion;

var UmdFiberHydrationContext = function (config) {
    var shouldSetTextContent = config.shouldSetTextContent,
        canHydrateInstance = config.canHydrateInstance,
        canHydrateTextInstance = config.canHydrateTextInstance,
        getNextHydratableSibling = config.getNextHydratableSibling,
        getFirstHydratableChild = config.getFirstHydratableChild,
        hydrateInstance = config.hydrateInstance,
        hydrateTextInstance = config.hydrateTextInstance,
        didNotHydrateInstance = config.didNotHydrateInstance,
        didNotFindHydratableInstance = config.didNotFindHydratableInstance,
        didNotFindHydratableTextInstance = config.didNotFindHydratableTextInstance;


    // The deepest Fiber on the stack involved in a hydration context.
    // This may have been an insertion or a hydration.
    var hydrationParentFiber = null;
    var nextHydratableInstance = null;
    var isHydrating = false;

    function enterHydrationState(fiber) {
        var parentInstance = fiber.stateNode.containerInfo;
        nextHydratableInstance = getFirstHydratableChild(parentInstance);
        hydrationParentFiber = fiber;
        isHydrating = true;
        return true;
    }

    function deleteHydratableInstance(returnFiber, instance) {
        {
            switch (returnFiber.tag) {
                case HostRoot$10:
                    didNotHydrateInstance(returnFiber.stateNode.containerInfo, instance);
                    break;
                case HostComponent$10:
                    didNotHydrateInstance(returnFiber.stateNode, instance);
                    break;
            }
        }

        var childToDelete = createFiberFromHostInstanceForDeletion$1();
        childToDelete.stateNode = instance;
        childToDelete['return'] = returnFiber;
        childToDelete.effectTag = Deletion$2;

        // This might seem like it belongs on progressedFirstDeletion. However,
        // these children are not part of the reconciliation list of children.
        // Even if we abort and rereconcile the children, that will try to hydrate
        // again and the nodes are still in the host tree so these will be
        // recreated.
        if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = childToDelete;
            returnFiber.lastEffect = childToDelete;
        } else {
            returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
        }
    }

    function insertNonHydratedInstance(returnFiber, fiber) {
        fiber.effectTag |= Placement$6;
        {
            var parentInstance;
            switch (returnFiber.tag) {
                // TODO: Currently we don't warn for insertions into the root because
                // we always insert into the root in the non-hydrating case. We just
                // delete the existing content. Reenable this once we have a better
                // strategy for determining if we're hydrating or not.
                // case HostRoot:
                //   parentInstance = returnFiber.stateNode.containerInfo;
                //   break;
                case HostComponent$10:
                    parentInstance = returnFiber.stateNode;
                    break;
                default:
                    return;
            }
            switch (fiber.tag) {
                case HostComponent$10:
                    var type = fiber.type;
                    var props = fiber.pendingProps;
                    didNotFindHydratableInstance(parentInstance, type, props);
                    break;
                case HostText$8:
                    var text = fiber.pendingProps;
                    didNotFindHydratableTextInstance(parentInstance, text);
                    break;
            }
        }
    }

    function canHydrate(fiber, nextInstance) {
        switch (fiber.tag) {
            case HostComponent$10:
                {
                    var type = fiber.type;
                    var props = fiber.pendingProps;
                    return canHydrateInstance(nextInstance, type, props);
                }
            case HostText$8:
                {
                    var text = fiber.pendingProps;
                    return canHydrateTextInstance(nextInstance, text);
                }
            default:
                return false;
        }
    }

    function tryToClaimNextHydratableInstance(fiber) {
        if (!isHydrating) {
            return;
        }
        var nextInstance = nextHydratableInstance;
        if (!nextInstance) {
            // Nothing to hydrate. Make it an insertion.
            insertNonHydratedInstance(hydrationParentFiber, fiber);
            isHydrating = false;
            hydrationParentFiber = fiber;
            return;
        }
        if (!canHydrate(fiber, nextInstance)) {
            // If we can't hydrate this instance let's try the next one.
            // We use this as a heuristic. It's based on intuition and not data so it
            // might be flawed or unnecessary.
            nextInstance = getNextHydratableSibling(nextInstance);
            if (!nextInstance || !canHydrate(fiber, nextInstance)) {
                // Nothing to hydrate. Make it an insertion.
                insertNonHydratedInstance(hydrationParentFiber, fiber);
                isHydrating = false;
                hydrationParentFiber = fiber;
                return;
            }
            // We matched the next one, we'll now assume that the first one was
            // superfluous and we'll delete it. Since we can't eagerly delete it
            // we'll have to schedule a deletion. To do that, this node needs a dummy
            // fiber associated with it.
            deleteHydratableInstance(hydrationParentFiber, nextHydratableInstance);
        }
        fiber.stateNode = nextInstance;
        hydrationParentFiber = fiber;
        nextHydratableInstance = getFirstHydratableChild(nextInstance);
    }

    function prepareToHydrateHostInstance(fiber, rootContainerInstance, hostContext) {
        var instance = fiber.stateNode;
        var updatePayload = hydrateInstance(instance, fiber.type, fiber.memoizedProps, rootContainerInstance, hostContext, fiber);
        // TODO: Type this specific to this type of component.
        fiber.updateQueue = updatePayload;
        // If the update payload indicates that there is a change or if there
        // is a new ref we mark this as an update.
        if (updatePayload !== null) {
            return true;
        }
        return false;
    }

    function prepareToHydrateHostTextInstance(fiber) {
        var textInstance = fiber.stateNode;
        var shouldUpdate = hydrateTextInstance(textInstance, fiber.memoizedProps, fiber);
        return shouldUpdate;
    }

    function popToNextHostParent(fiber) {
        var parent = fiber['return'];
        while (parent !== null && parent.tag !== HostComponent$10 && parent.tag !== HostRoot$10) {
            parent = parent['return'];
        }
        hydrationParentFiber = parent;
    }

    function popHydrationState(fiber) {
        if (fiber !== hydrationParentFiber) {
            // We're deeper than the current hydration context, inside an inserted
            // tree.
            return false;
        }
        if (!isHydrating) {
            // If we're not currently hydrating but we're in a hydration context, then
            // we were an insertion and now need to pop up reenter hydration of our
            // siblings.
            popToNextHostParent(fiber);
            isHydrating = true;
            return false;
        }

        var type = fiber.type;

        // If we have any remaining hydratable nodes, we need to delete them now.
        // We only do this deeper than head and body since they tend to have random
        // other nodes in them. We also ignore components with pure text content in
        // side of them.
        // TODO: Better heuristic.
        if (fiber.tag !== HostComponent$10 || type !== 'head' && type !== 'body' && !shouldSetTextContent(type, fiber.memoizedProps)) {
            var nextInstance = nextHydratableInstance;
            while (nextInstance) {
                deleteHydratableInstance(fiber, nextInstance);
                nextInstance = getNextHydratableSibling(nextInstance);
            }
        }

        popToNextHostParent(fiber);
        nextHydratableInstance = hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
        return true;
    }

    function resetHydrationState() {
        hydrationParentFiber = null;
        nextHydratableInstance = null;
        isHydrating = false;
    }

    return {
        enterHydrationState: enterHydrationState,
        resetHydrationState: resetHydrationState,
        tryToClaimNextHydratableInstance: tryToClaimNextHydratableInstance,
        prepareToHydrateHostInstance: prepareToHydrateHostInstance,
        prepareToHydrateHostTextInstance: prepareToHydrateHostTextInstance,
        popHydrationState: popHydrationState
    };
};






var popContextProvider$1 = UmdFiberContext.popContextProvider;

var reset$1 = UmdFiberStack.reset;

var getStackAddendumByWorkInProgressFiber$2 = UmdFiberComponentTreeHook.getStackAddendumByWorkInProgressFiber;

var logCapturedError = UmdFiberErrorLogger.logCapturedError;

var invokeGuardedCallback$1 = UmdErrorUtils_1.invokeGuardedCallback;
var hasCaughtError = UmdErrorUtils_1.hasCaughtError;
var clearCaughtError = UmdErrorUtils_1.clearCaughtError;







var UmdCurrentOwner$1 = UmdGlobalSharedState_1.UmdCurrentOwner;



var createWorkInProgress$1 = UmdFiber.createWorkInProgress;
var largerPriority$1 = UmdFiber.largerPriority;

var onCommitRoot = UmdFiberDevToolsHook.onCommitRoot;

var NoWork$2 = UmdPriorityLevel.NoWork;
var SynchronousPriority$1 = UmdPriorityLevel.SynchronousPriority;
var TaskPriority$1 = UmdPriorityLevel.TaskPriority;
var HighPriority = UmdPriorityLevel.HighPriority;
var LowPriority = UmdPriorityLevel.LowPriority;
var OffscreenPriority = UmdPriorityLevel.OffscreenPriority;

var AsyncUpdates = UmdTypeOfInternalContext.AsyncUpdates;

var PerformedWork = UmdTypeOfSideEffect.PerformedWork;
var Placement$1 = UmdTypeOfSideEffect.Placement;
var Update = UmdTypeOfSideEffect.Update;
var PlacementAndUpdate = UmdTypeOfSideEffect.PlacementAndUpdate;
var Deletion = UmdTypeOfSideEffect.Deletion;
var ContentReset = UmdTypeOfSideEffect.ContentReset;
var Callback = UmdTypeOfSideEffect.Callback;
var Err = UmdTypeOfSideEffect.Err;
var Ref = UmdTypeOfSideEffect.Ref;

var HostRoot$6 = UmdTypeOfWork.HostRoot;
var HostComponent$6 = UmdTypeOfWork.HostComponent;
var HostPortal$3 = UmdTypeOfWork.HostPortal;
var ClassComponent$5 = UmdTypeOfWork.ClassComponent;

var getUpdatePriority$1 = UmdFiberUpdateQueue.getUpdatePriority;

var _require14 = UmdFiberContext;
var resetContext$1 = _require14.resetContext;



{


    var UmdDebugCurrentFiber$3 = UmdDebugCurrentFiber_1;

    var _require15 = UmdDebugFiberPerf_1,
        recordEffect = _require15.recordEffect,
        recordScheduleUpdate = _require15.recordScheduleUpdate,
        startWorkTimer = _require15.startWorkTimer,
        stopWorkTimer = _require15.stopWorkTimer,
        stopFailedWorkTimer = _require15.stopFailedWorkTimer,
        startWorkLoopTimer = _require15.startWorkLoopTimer,
        stopWorkLoopTimer = _require15.stopWorkLoopTimer,
        startCommitTimer = _require15.startCommitTimer,
        stopCommitTimer = _require15.stopCommitTimer,
        startCommitHostEffectsTimer = _require15.startCommitHostEffectsTimer,
        stopCommitHostEffectsTimer = _require15.stopCommitHostEffectsTimer,
        startCommitLifeCyclesTimer = _require15.startCommitLifeCyclesTimer,
        stopCommitLifeCyclesTimer = _require15.stopCommitLifeCyclesTimer;



    var warnAboutInvalidUpdates = function (instance) {
        switch (UmdDebugCurrentFiber$3.phase) {
            case 'getChildContext':
                break;
            case 'render':
                break;
        }
    };
}

var timeHeuristicForUnitOfWork = 1;

var UmdFiberScheduler = function (config) {
    var hostContext = UmdFiberHostContext(config);
    var hydrationContext = UmdFiberHydrationContext(config);
    var popHostContainer = hostContext.popHostContainer,
        popHostContext = hostContext.popHostContext,
        resetHostContainer = hostContext.resetHostContainer;

    var _UmdFiberBeginWork = UmdFiberBeginWork(config, hostContext, hydrationContext, scheduleUpdate, getPriorityContext),
        beginWork = _UmdFiberBeginWork.beginWork,
        beginFailedWork = _UmdFiberBeginWork.beginFailedWork;

    var _UmdFiberCompleteWo = UmdFiberCompleteWork(config, hostContext, hydrationContext),
        completeWork = _UmdFiberCompleteWo.completeWork;

    var _UmdFiberCommitWork = UmdFiberCommitWork(config, captureError),
        commitPlacement = _UmdFiberCommitWork.commitPlacement,
        commitDeletion = _UmdFiberCommitWork.commitDeletion,
        commitWork = _UmdFiberCommitWork.commitWork,
        commitLifeCycles = _UmdFiberCommitWork.commitLifeCycles,
        commitAttachRef = _UmdFiberCommitWork.commitAttachRef,
        commitDetachRef = _UmdFiberCommitWork.commitDetachRef;

    var scheduleDeferredCallback = config.scheduleDeferredCallback,
        useSyncScheduling = config.useSyncScheduling,
        prepareForCommit = config.prepareForCommit,
        resetAfterCommit = config.resetAfterCommit;

    // The priority level to use when scheduling an update. We use NoWork to
    // represent the default priority.
    // TODO: Should we change this to an array instead of using the call stack?
    // Might be less confusing.

    var priorityContext = NoWork$2;

    // Keeps track of whether we're currently in a work loop.
    var isPerformingWork = false;

    // Keeps track of whether the current deadline has expired.
    var deadlineHasExpired = false;

    // Keeps track of whether we should should batch sync updates.
    var isBatchingUpdates = false;

    // This is needed for the weird case where the initial mount is synchronous
    // even inside batchedUpdates :(
    var isUnbatchingUpdates = false;

    // The next work in progress fiber that we're currently working on.
    var nextUnitOfWork = null;
    var nextPriorityLevel = NoWork$2;

    // The next fiber with an effect that we're currently committing.
    var nextEffect = null;

    var pendingCommit = null;

    // Linked list of roots with scheduled work on them.
    var nextScheduledRoot = null;
    var lastScheduledRoot = null;

    // Keep track of which host environment callbacks are scheduled.
    var isCallbackScheduled = false;

    // Keep track of which fibers have captured an error that need to be handled.
    // Work is removed from this collection after componentDidCatch is called.
    var capturedErrors = null;
    // Keep track of which fibers have failed during the current batch of work.
    // This is a different set than capturedErrors, because it is not reset until
    // the end of the batch. This is needed to propagate errors correctly if a
    // subtree fails more than once.
    var failedBoundaries = null;
    // Error boundaries that captured an error during the current commit.
    var commitPhaseBoundaries = null;
    var firstUncaughtError = null;
    var didFatal = false;

    var isCommitting = false;
    var isUnmounting = false;

    // Use these to prevent an infinite loop of nested updates
    var NESTED_UPDATE_LIMIT = 1000;
    var nestedUpdateCount = 0;
    var nextRenderedTree = null;

    function resetContextStack() {
        // Reset the stack
        reset$1();
        // Reset the cursors
        resetContext$1();
        resetHostContainer();
    }

    // resetNextUnitOfWork mutates the current priority context. It is reset after
    // after the workLoop exits, so never call resetNextUnitOfWork from outside
    // the work loop.
    function resetNextUnitOfWork() {
        // Clear out roots with no more work on them, or if they have uncaught errors
        while (nextScheduledRoot !== null && nextScheduledRoot.current.pendingWorkPriority === NoWork$2) {
            // Unschedule this root.
            nextScheduledRoot.isScheduled = false;
            // Read the next pointer now.
            // We need to clear it in case this root gets scheduled again later.
            var next = nextScheduledRoot.nextScheduledRoot;
            nextScheduledRoot.nextScheduledRoot = null;
            // Exit if we cleared all the roots and there's no work to do.
            if (nextScheduledRoot === lastScheduledRoot) {
                nextScheduledRoot = null;
                lastScheduledRoot = null;
                nextPriorityLevel = NoWork$2;
                return null;
            }
            // Continue with the next root.
            // If there's no work on it, it will get unscheduled too.
            nextScheduledRoot = next;
        }

        var root = nextScheduledRoot;
        var highestPriorityRoot = null;
        var highestPriorityLevel = NoWork$2;
        while (root !== null) {
            if (root.current.pendingWorkPriority !== NoWork$2 && (highestPriorityLevel === NoWork$2 || highestPriorityLevel > root.current.pendingWorkPriority)) {
                highestPriorityLevel = root.current.pendingWorkPriority;
                highestPriorityRoot = root;
            }
            // We didn't find anything to do in this root, so let's try the next one.
            root = root.nextScheduledRoot;
        }
        if (highestPriorityRoot !== null) {
            nextPriorityLevel = highestPriorityLevel;
            // Before we start any new work, let's make sure that we have a fresh
            // stack to work from.
            // TODO: This call is buried a bit too deep. It would be nice to have
            // a single point which happens right before any new work and
            // unfortunately this is it.
            resetContextStack();

            nextUnitOfWork = createWorkInProgress$1(highestPriorityRoot.current, highestPriorityLevel);
            if (highestPriorityRoot !== nextRenderedTree) {
                // We've switched trees. Reset the nested update counter.
                nestedUpdateCount = 0;
                nextRenderedTree = highestPriorityRoot;
            }
            return;
        }

        nextPriorityLevel = NoWork$2;
        nextUnitOfWork = null;
        nextRenderedTree = null;
        return;
    }

    function commitAllHostEffects() {
        while (nextEffect !== null) {
            {
                UmdDebugCurrentFiber$3.setCurrentFiber(nextEffect, null);
                recordEffect();
            }

            var effectTag = nextEffect.effectTag;
            if (effectTag & ContentReset) {
                config.resetTextContent(nextEffect.stateNode);
            }

            if (effectTag & Ref) {
                var current = nextEffect.alternate;
                if (current !== null) {
                    commitDetachRef(current);
                }
            }

            // The following switch statement is only concerned about placement,
            // updates, and deletions. To avoid needing to add a case for every
            // possible bitmap value, we remove the secondary effects from the
            // effect tag and switch on that value.
            var primaryEffectTag = effectTag & ~(Callback | Err | ContentReset | Ref | PerformedWork);
            switch (primaryEffectTag) {
                case Placement$1:
                    {
                        commitPlacement(nextEffect);
                        // Clear the "placement" from effect tag so that we know that this is inserted, before
                        // any life-cycles like componentDidMount gets called.
                        // TODO: findDOMNode doesn't rely on this any more but isMounted
                        // does and isMounted is deprecated anyway so we should be able
                        // to kill this.
                        nextEffect.effectTag &= ~Placement$1;
                        break;
                    }
                case PlacementAndUpdate:
                    {
                        // Placement
                        commitPlacement(nextEffect);
                        // Clear the "placement" from effect tag so that we know that this is inserted, before
                        // any life-cycles like componentDidMount gets called.
                        nextEffect.effectTag &= ~Placement$1;

                        // Update
                        var _current = nextEffect.alternate;
                        commitWork(_current, nextEffect);
                        break;
                    }
                case Update:
                    {
                        var _current2 = nextEffect.alternate;
                        commitWork(_current2, nextEffect);
                        break;
                    }
                case Deletion:
                    {
                        isUnmounting = true;
                        commitDeletion(nextEffect);
                        isUnmounting = false;
                        break;
                    }
            }
            nextEffect = nextEffect.nextEffect;
        }

        {
            UmdDebugCurrentFiber$3.resetCurrentFiber();
        }
    }

    function commitAllLifeCycles() {
        while (nextEffect !== null) {
            var effectTag = nextEffect.effectTag;

            // Use Task priority for lifecycle updates
            if (effectTag & (Update | Callback)) {
                {
                    recordEffect();
                }
                var current = nextEffect.alternate;
                commitLifeCycles(current, nextEffect);
            }

            if (effectTag & Ref) {
                {
                    recordEffect();
                }
                commitAttachRef(nextEffect);
            }

            if (effectTag & Err) {
                {
                    recordEffect();
                }
                commitErrorHandling(nextEffect);
            }

            var next = nextEffect.nextEffect;
            // Ensure that we clean these up so that we don't accidentally keep them.
            // I'm not actually sure this matters because we can't reset firstEffect
            // and lastEffect since they're on every node, not just the effectful
            // ones. So we have to clean everything as we reuse nodes anyway.
            nextEffect.nextEffect = null;
            // Ensure that we reset the effectTag here so that we can rely on effect
            // tags to reason about the current life-cycle.
            nextEffect = next;
        }
    }

    function commitAllWork(finishedWork) {
        // We keep track of this so that captureError can collect any boundaries
        // that capture an error during the commit phase. The reason these aren't
        // local to this function is because errors that occur during cWU are
        // captured elsewhere, to prevent the unmount from being interrupted.
        isCommitting = true;
        {
            startCommitTimer();
        }

        pendingCommit = null;
        var root = finishedWork.stateNode;

        if (nextPriorityLevel === SynchronousPriority$1 || nextPriorityLevel === TaskPriority$1) {
            // Keep track of the number of iterations to prevent an infinite
            // update loop.
            nestedUpdateCount++;
        }

        // Reset this to null before calling lifecycles
        UmdCurrentOwner$1.current = null;

        var firstEffect = void 0;
        if (finishedWork.effectTag > PerformedWork) {
            // A fiber's effect list consists only of its children, not itself. So if
            // the root has an effect, we need to add it to the end of the list. The
            // resulting list is the set that would belong to the root's parent, if
            // it had one; that is, all the effects in the tree including the root.
            if (finishedWork.lastEffect !== null) {
                finishedWork.lastEffect.nextEffect = finishedWork;
                firstEffect = finishedWork.firstEffect;
            } else {
                firstEffect = finishedWork;
            }
        } else {
            // There is no effect on the root.
            firstEffect = finishedWork.firstEffect;
        }

        prepareForCommit();

        // Commit all the side-effects within a tree. We'll do this in two passes.
        // The first pass performs all the host insertions, updates, deletions and
        // ref unmounts.
        nextEffect = firstEffect;
        {
            startCommitHostEffectsTimer();
        }
        while (nextEffect !== null) {
            var didError = false;
            var _error = void 0;
            {
                invokeGuardedCallback$1(null, commitAllHostEffects, null);
                if (hasCaughtError()) {
                    didError = true;
                    _error = clearCaughtError();
                }
            }
            if (didError) {
                captureError(nextEffect, _error);
                // Clean-up
                if (nextEffect !== null) {
                    nextEffect = nextEffect.nextEffect;
                }
            }
        }
        {
            stopCommitHostEffectsTimer();
        }

        resetAfterCommit();

        // The work-in-progress tree is now the current tree. This must come after
        // the first pass of the commit phase, so that the previous tree is still
        // current during componentWillUnmount, but before the second pass, so that
        // the finished work is current during componentDidMount/Update.
        root.current = finishedWork;

        // In the second pass we'll perform all life-cycles and ref callbacks.
        // Life-cycles happen as a separate pass so that all placements, updates,
        // and deletions in the entire tree have already been invoked.
        // This pass also triggers any renderer-specific initial effects.
        nextEffect = firstEffect;
        {
            startCommitLifeCyclesTimer();
        }
        while (nextEffect !== null) {
            var _didError = false;
            var _error2 = void 0;
            {
                invokeGuardedCallback$1(null, commitAllLifeCycles, null);
                if (hasCaughtError()) {
                    _didError = true;
                    _error2 = clearCaughtError();
                }
            }
            if (_didError) {
                captureError(nextEffect, _error2);
                if (nextEffect !== null) {
                    nextEffect = nextEffect.nextEffect;
                }
            }
        }

        isCommitting = false;
        {
            stopCommitLifeCyclesTimer();
            stopCommitTimer();
        }
        if (typeof onCommitRoot === 'function') {
            onCommitRoot(finishedWork.stateNode);
        }


        // If we caught any errors during this commit, schedule their boundaries
        // to update.
        if (commitPhaseBoundaries) {
            commitPhaseBoundaries.forEach(scheduleErrorRecovery);
            commitPhaseBoundaries = null;
        }

        // This tree is done. Reset the unit of work pointer to the next highest
        // priority root. If there's no more work left, the pointer is set to null.
        resetNextUnitOfWork();
    }

    function resetWorkPriority(workInProgress, renderPriority) {
        if (workInProgress.pendingWorkPriority !== NoWork$2 && workInProgress.pendingWorkPriority > renderPriority) {
            // This was a down-prioritization. Don't bubble priority from children.
            return;
        }

        // Check for pending update priority.
        var newPriority = getUpdatePriority$1(workInProgress);

        // TODO: Coroutines need to visit stateNode

        var child = workInProgress.child;
        while (child !== null) {
            // Ensure that remaining work priority bubbles up.
            newPriority = largerPriority$1(newPriority, child.pendingWorkPriority);
            child = child.sibling;
        }
        workInProgress.pendingWorkPriority = newPriority;
    }

    function completeUnitOfWork(workInProgress) {
        while (true) {
            // The current, flushed, state of this fiber is the alternate.
            // Ideally nothing should rely on this, but relying on it here
            // means that we don't need an additional field on the work in
            // progress.
            var current = workInProgress.alternate;
            var next = completeWork(current, workInProgress, nextPriorityLevel);

            var returnFiber = workInProgress['return'];
            var siblingFiber = workInProgress.sibling;

            resetWorkPriority(workInProgress, nextPriorityLevel);

            if (next !== null) {
                {
                    stopWorkTimer(workInProgress);
                }

                // If completing this work spawned new work, do that next. We'll come
                // back here again.
                return next;
            }

            if (returnFiber !== null) {
                // Append all the effects of the subtree and this fiber onto the effect
                // list of the parent. The completion order of the children affects the
                // side-effect order.
                if (returnFiber.firstEffect === null) {
                    returnFiber.firstEffect = workInProgress.firstEffect;
                }
                if (workInProgress.lastEffect !== null) {
                    if (returnFiber.lastEffect !== null) {
                        returnFiber.lastEffect.nextEffect = workInProgress.firstEffect;
                    }
                    returnFiber.lastEffect = workInProgress.lastEffect;
                }

                // If this fiber had side-effects, we append it AFTER the children's
                // side-effects. We can perform certain side-effects earlier if
                // needed, by doing multiple passes over the effect list. We don't want
                // to schedule our own side-effect on our own list because if end up
                // reusing children we'll schedule this effect onto itself since we're
                // at the end.
                var effectTag = workInProgress.effectTag;
                // Skip both NoWork and PerformedWork tags when creating the effect list.
                // PerformedWork effect is read by Umd DevTools but shouldn't be committed.
                if (effectTag > PerformedWork) {
                    if (returnFiber.lastEffect !== null) {
                        returnFiber.lastEffect.nextEffect = workInProgress;
                    } else {
                        returnFiber.firstEffect = workInProgress;
                    }
                    returnFiber.lastEffect = workInProgress;
                }
            }

            {
                stopWorkTimer(workInProgress);
            }


            if (siblingFiber !== null) {
                // If there is more work to do in this returnFiber, do that next.
                return siblingFiber;
            } else if (returnFiber !== null) {
                // If there's no more work in this returnFiber. Complete the returnFiber.
                workInProgress = returnFiber;
                continue;
            } else {
                // We've reached the root. Mark the root as pending commit. Depending
                // on how much time we have left, we'll either commit it now or in
                // the next frame.
                pendingCommit = workInProgress;
                return null;
            }
        }

        // Without this explicit null return Flow complains of invalid return type
        // TODO Remove the above while(true) loop
        // eslint-disable-next-line no-unreachable
        return null;
    }

    function performUnitOfWork(workInProgress) {
        // The current, flushed, state of this fiber is the alternate.
        // Ideally nothing should rely on this, but relying on it here
        // means that we don't need an additional field on the work in
        // progress.
        var current = workInProgress.alternate;

        // See if beginning this work spawns more work.
        {
            startWorkTimer(workInProgress);
        }
        var next = beginWork(current, workInProgress, nextPriorityLevel);


        if (next === null) {
            // If this doesn't spawn new work, complete the current work.
            next = completeUnitOfWork(workInProgress);
        }

        UmdCurrentOwner$1.current = null;
        {
            UmdDebugCurrentFiber$3.resetCurrentFiber();
        }

        return next;
    }

    function performFailedUnitOfWork(workInProgress) {
        // The current, flushed, state of this fiber is the alternate.
        // Ideally nothing should rely on this, but relying on it here
        // means that we don't need an additional field on the work in
        // progress.
        var current = workInProgress.alternate;

        // See if beginning this work spawns more work.
        {
            startWorkTimer(workInProgress);
        }
        var next = beginFailedWork(current, workInProgress, nextPriorityLevel);

        if (next === null) {
            // If this doesn't spawn new work, complete the current work.
            next = completeUnitOfWork(workInProgress);
        }

        UmdCurrentOwner$1.current = null;
        {
            UmdDebugCurrentFiber$3.resetCurrentFiber();
        }

        return next;
    }

    function performDeferredWork(deadline) {
        performWork(OffscreenPriority, deadline);
    }

    function handleCommitPhaseErrors() {
        // This is a special work loop for handling commit phase errors. It's
        // similar to the syncrhonous work loop, but does an additional check on
        // each fiber to see if it's an error boundary with an unhandled error. If
        // so, it uses a forked version of performUnitOfWork that unmounts the
        // failed subtree.
        //
        // The loop stops once the children have unmounted and error lifecycles are
        // called. Then we return to the regular flow.

        if (capturedErrors !== null && capturedErrors.size > 0 && nextPriorityLevel === TaskPriority$1) {
            while (nextUnitOfWork !== null) {
                if (hasCapturedError(nextUnitOfWork)) {
                    // Use a forked version of performUnitOfWork
                    nextUnitOfWork = performFailedUnitOfWork(nextUnitOfWork);
                } else {
                    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
                }
                if (nextUnitOfWork === null) {
                    // We just completed a root. Commit it now.
                    priorityContext = TaskPriority$1;
                    commitAllWork(pendingCommit);
                    priorityContext = nextPriorityLevel;

                    if (capturedErrors === null || capturedErrors.size === 0 || nextPriorityLevel !== TaskPriority$1) {
                        // There are no more unhandled errors. We can exit this special
                        // work loop. If there's still additional work, we'll perform it
                        // using one of the normal work loops.
                        break;
                    }
                    // The commit phase produced additional errors. Continue working.
                }
            }
        }
    }

    function workLoop(minPriorityLevel, deadline) {
        if (pendingCommit !== null) {
            priorityContext = TaskPriority$1;
            commitAllWork(pendingCommit);
            handleCommitPhaseErrors();
        } else if (nextUnitOfWork === null) {
            resetNextUnitOfWork();
        }

        if (nextPriorityLevel === NoWork$2 || nextPriorityLevel > minPriorityLevel) {
            return;
        }

        // During the render phase, updates should have the same priority at which
        // we're rendering.
        priorityContext = nextPriorityLevel;

        loop: do {
            if (nextPriorityLevel <= TaskPriority$1) {
                // Flush all synchronous and task work.
                while (nextUnitOfWork !== null) {
                    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
                    if (nextUnitOfWork === null) {
                        // We just completed a root. Commit it now.
                        priorityContext = TaskPriority$1;
                        commitAllWork(pendingCommit);
                        priorityContext = nextPriorityLevel;
                        // Clear any errors that were scheduled during the commit phase.
                        handleCommitPhaseErrors();
                        // The priority level may have changed. Check again.
                        if (nextPriorityLevel === NoWork$2 || nextPriorityLevel > minPriorityLevel || nextPriorityLevel > TaskPriority$1) {
                            // The priority level does not match.
                            break;
                        }
                    }
                }
            } else if (deadline !== null) {
                // Flush asynchronous work until the deadline expires.
                while (nextUnitOfWork !== null && !deadlineHasExpired) {
                    if (deadline.timeRemaining() > timeHeuristicForUnitOfWork) {
                        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
                        // In a deferred work batch, iff nextUnitOfWork returns null, we just
                        // completed a root and a pendingCommit exists. Logically, we could
                        // omit either of the checks in the following condition, but we need
                        // both to satisfy Flow.
                        if (nextUnitOfWork === null) {
                            // We just completed a root. If we have time, commit it now.
                            // Otherwise, we'll commit it in the next frame.
                            if (deadline.timeRemaining() > timeHeuristicForUnitOfWork) {
                                priorityContext = TaskPriority$1;
                                commitAllWork(pendingCommit);
                                priorityContext = nextPriorityLevel;
                                // Clear any errors that were scheduled during the commit phase.
                                handleCommitPhaseErrors();
                                // The priority level may have changed. Check again.
                                if (nextPriorityLevel === NoWork$2 || nextPriorityLevel > minPriorityLevel || nextPriorityLevel < HighPriority) {
                                    // The priority level does not match.
                                    break;
                                }
                            } else {
                                deadlineHasExpired = true;
                            }
                        }
                    } else {
                        deadlineHasExpired = true;
                    }
                }
            }

            // There might be work left. Depending on the priority, we should
            // either perform it now or schedule a callback to perform it later.
            switch (nextPriorityLevel) {
                case SynchronousPriority$1:
                case TaskPriority$1:
                    // We have remaining synchronous or task work. Keep performing it,
                    // regardless of whether we're inside a callback.
                    if (nextPriorityLevel <= minPriorityLevel) {
                        continue loop;
                    }
                    break loop;
                case HighPriority:
                case LowPriority:
                case OffscreenPriority:
                    // We have remaining async work.
                    if (deadline === null) {
                        // We're not inside a callback. Exit and perform the work during
                        // the next callback.
                        break loop;
                    }
                    // We are inside a callback.
                    if (!deadlineHasExpired && nextPriorityLevel <= minPriorityLevel) {
                        // We still have time. Keep working.
                        continue loop;
                    }
                    // We've run out of time. Exit.
                    break loop;
                case NoWork$2:
                    // No work left. We can exit.
                    break loop;
                default:
                    break;
            }
        } while (true);
    }

    function performWorkCatchBlock(failedWork, boundary, minPriorityLevel, deadline) {
        // We're going to restart the error boundary that captured the error.
        // Conceptually, we're unwinding the stack. We need to unwind the
        // context stack, too.
        unwindContexts(failedWork, boundary);

        // Restart the error boundary using a forked version of
        // performUnitOfWork that deletes the boundary's children. The entire
        // failed subree will be unmounted. During the commit phase, a special
        // lifecycle method is called on the error boundary, which triggers
        // a re-render.
        nextUnitOfWork = performFailedUnitOfWork(boundary);

        // Continue working.
        workLoop(minPriorityLevel, deadline);
    }

    function performWork(minPriorityLevel, deadline) {
        {
            startWorkLoopTimer();
        }

        isPerformingWork = true;

        // The priority context changes during the render phase. We'll need to
        // reset it at the end.
        var previousPriorityContext = priorityContext;

        var didError = false;
        var error = null;
        {
            invokeGuardedCallback$1(null, workLoop, null, minPriorityLevel, deadline);
            if (hasCaughtError()) {
                didError = true;
                error = clearCaughtError();
            }
        }

        // An error was thrown during the render phase.
        while (didError) {
            if (didFatal) {
                // This was a fatal error. Don't attempt to recover from it.
                firstUncaughtError = error;
                break;
            }

            var failedWork = nextUnitOfWork;
            if (failedWork === null) {
                // An error was thrown but there's no current unit of work. This can
                // happen during the commit phase if there's a bug in the renderer.
                didFatal = true;
                continue;
            }

            // "Capture" the error by finding the nearest boundary. If there is no
            // error boundary, we use the root.
            var boundary = captureError(failedWork, error);

            if (didFatal) {
                // The error we just captured was a fatal error. This happens
                // when the error propagates to the root more than once.
                continue;
            }

            didError = false;
            error = null;
            {
                invokeGuardedCallback$1(null, performWorkCatchBlock, null, failedWork, boundary, minPriorityLevel, deadline);
                if (hasCaughtError()) {
                    didError = true;
                    error = clearCaughtError();
                    continue;
                }
            }
            // We're finished working. Exit the error loop.
            break;
        }

        // Reset the priority context to its previous value.
        priorityContext = previousPriorityContext;

        // If we're inside a callback, set this to false, since we just flushed it.
        if (deadline !== null) {
            isCallbackScheduled = false;
        }
        // If there's remaining async work, make sure we schedule another callback.
        if (nextPriorityLevel > TaskPriority$1 && !isCallbackScheduled) {
            scheduleDeferredCallback(performDeferredWork);
            isCallbackScheduled = true;
        }

        var errorToThrow = firstUncaughtError;

        // We're done performing work. Time to clean up.
        isPerformingWork = false;
        deadlineHasExpired = false;
        didFatal = false;
        firstUncaughtError = null;
        capturedErrors = null;
        failedBoundaries = null;
        nextRenderedTree = null;
        nestedUpdateCount = 0;

        {
            stopWorkLoopTimer();
        }

        // It's safe to throw any unhandled errors.
        if (errorToThrow !== null) {
            throw errorToThrow;
        }
    }

    // Returns the boundary that captured the error, or null if the error is ignored
    function captureError(failedWork, error) {
        // It is no longer valid because we exited the user code.
        UmdCurrentOwner$1.current = null;
        {
            UmdDebugCurrentFiber$3.resetCurrentFiber();
        }

        // Search for the nearest error boundary.
        var boundary = null;

        // Passed to logCapturedError()
        var errorBoundaryFound = false;
        var willRetry = false;
        var errorBoundaryName = null;

        // Host containers are a special case. If the failed work itself is a host
        // container, then it acts as its own boundary. In all other cases, we
        // ignore the work itself and only search through the parents.
        if (failedWork.tag === HostRoot$6) {
            boundary = failedWork;

            if (isFailedBoundary(failedWork)) {
                // If this root already failed, there must have been an error when
                // attempting to unmount it. This is a worst-case scenario and
                // should only be possible if there's a bug in the renderer.
                didFatal = true;
            }
        } else {
            var node = failedWork['return'];
            while (node !== null && boundary === null) {
                if (node.tag === ClassComponent$5) {
                    var instance = node.stateNode;
                    if (typeof instance.componentDidCatch === 'function') {
                        errorBoundaryFound = true;
                        errorBoundaryName = getComponentName_1(node);

                        // Found an error boundary!
                        boundary = node;
                        willRetry = true;
                    }
                } else if (node.tag === HostRoot$6) {
                    // Treat the root like a no-op error boundary
                    boundary = node;
                }

                if (isFailedBoundary(node)) {
                    // This boundary is already in a failed state.

                    // If we're currently unmounting, that means this error was
                    // thrown while unmounting a failed subtree. We should ignore
                    // the error.
                    if (isUnmounting) {
                        return null;
                    }

                    // If we're in the commit phase, we should check to see if
                    // this boundary already captured an error during this commit.
                    // This case exists because multiple errors can be thrown during
                    // a single commit without interruption.
                    if (commitPhaseBoundaries !== null && (commitPhaseBoundaries.has(node) || node.alternate !== null && commitPhaseBoundaries.has(node.alternate))) {
                        // If so, we should ignore this error.
                        return null;
                    }

                    // The error should propagate to the next boundary -— we keep looking.
                    boundary = null;
                    willRetry = false;
                }

                node = node['return'];
            }
        }

        if (boundary !== null) {
            // Add to the collection of failed boundaries. This lets us know that
            // subsequent errors in this subtree should propagate to the next boundary.
            if (failedBoundaries === null) {
                failedBoundaries = new Set();
            }
            failedBoundaries.add(boundary);

            // This method is unsafe outside of the begin and complete phases.
            // We might be in the commit phase when an error is captured.
            // The risk is that the return path from this Fiber may not be accurate.
            // That risk is acceptable given the benefit of providing users more context.
            var _componentStack = getStackAddendumByWorkInProgressFiber$2(failedWork);
            var _componentName = getComponentName_1(failedWork);

            // Add to the collection of captured errors. This is stored as a global
            // map of errors and their component stack location keyed by the boundaries
            // that capture them. We mostly use this Map as a Set; it's a Map only to
            // avoid adding a field to Fiber to store the error.
            if (capturedErrors === null) {
                capturedErrors = new Map();
            }

            var capturedError = {
                componentName: _componentName,
                componentStack: _componentStack,
                error: error,
                errorBoundary: errorBoundaryFound ? boundary.stateNode : null,
                errorBoundaryFound: errorBoundaryFound,
                errorBoundaryName: errorBoundaryName,
                willRetry: willRetry
            };

            capturedErrors.set(boundary, capturedError);

            try {
                logCapturedError(capturedError);
            } catch (e) {
                // Prevent cycle if logCapturedError() throws.
                // A cycle may still occur if logCapturedError renders a component that throws.
                console.error(e);
            }

            // If we're in the commit phase, defer scheduling an update on the
            // boundary until after the commit is complete
            if (isCommitting) {
                if (commitPhaseBoundaries === null) {
                    commitPhaseBoundaries = new Set();
                }
                commitPhaseBoundaries.add(boundary);
            } else {
                // Otherwise, schedule an update now.
                // TODO: Is this actually necessary during the render phase? Is it
                // possible to unwind and continue rendering at the same priority,
                // without corrupting internal state?
                scheduleErrorRecovery(boundary);
            }
            return boundary;
        } else if (firstUncaughtError === null) {
            // If no boundary is found, we'll need to throw the error
            firstUncaughtError = error;
        }
        return null;
    }

    function hasCapturedError(fiber) {
        // TODO: capturedErrors should store the boundary instance, to avoid needing
        // to check the alternate.
        return capturedErrors !== null && (capturedErrors.has(fiber) || fiber.alternate !== null && capturedErrors.has(fiber.alternate));
    }

    function isFailedBoundary(fiber) {
        // TODO: failedBoundaries should store the boundary instance, to avoid
        // needing to check the alternate.
        return failedBoundaries !== null && (failedBoundaries.has(fiber) || fiber.alternate !== null && failedBoundaries.has(fiber.alternate));
    }

    function commitErrorHandling(effectfulFiber) {
        var capturedError = void 0;
        if (capturedErrors !== null) {
            capturedError = capturedErrors.get(effectfulFiber);
            capturedErrors['delete'](effectfulFiber);
            if (capturedError == null) {
                if (effectfulFiber.alternate !== null) {
                    effectfulFiber = effectfulFiber.alternate;
                    capturedError = capturedErrors.get(effectfulFiber);
                    capturedErrors['delete'](effectfulFiber);
                }
            }
        }


        switch (effectfulFiber.tag) {
            case ClassComponent$5:
                var instance = effectfulFiber.stateNode;

                var info = {
                    componentStack: capturedError.componentStack
                };

                // Allow the boundary to handle the error, usually by scheduling
                // an update to itself
                instance.componentDidCatch(capturedError.error, info);
                return;
            case HostRoot$6:
                if (firstUncaughtError === null) {
                    // If this is the host container, we treat it as a no-op error
                    // boundary. We'll throw the first uncaught error once it's safe to
                    // do so, at the end of the batch.
                    firstUncaughtError = capturedError.error;
                }
                return;
            default:
        }
    }

    function unwindContexts(from, to) {
        var node = from;
        while (node !== null) {
            switch (node.tag) {
                case ClassComponent$5:
                    popContextProvider$1(node);
                    break;
                case HostComponent$6:
                    popHostContext(node);
                    break;
                case HostRoot$6:
                    popHostContainer(node);
                    break;
                case HostPortal$3:
                    popHostContainer(node);
                    break;
            }
            if (node === to || node.alternate === to) {
                {
                    stopFailedWorkTimer(node);
                }
                break;
            } else {
                stopWorkTimer(node);
            }
            node = node['return'];
        }
    }

    function scheduleRoot(root, priorityLevel) {
        if (priorityLevel === NoWork$2) {
            return;
        }

        if (!root.isScheduled) {
            root.isScheduled = true;
            if (lastScheduledRoot) {
                // Schedule ourselves to the end.
                lastScheduledRoot.nextScheduledRoot = root;
                lastScheduledRoot = root;
            } else {
                // We're the only work scheduled.
                nextScheduledRoot = root;
                lastScheduledRoot = root;
            }
        }
    }

    function scheduleUpdate(fiber, priorityLevel) {
        return scheduleUpdateImpl(fiber, priorityLevel, false);
    }

    function scheduleUpdateImpl(fiber, priorityLevel, isErrorRecovery) {
        {
            recordScheduleUpdate();
        }

        if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
            didFatal = true;
        }

        if (!isPerformingWork && priorityLevel <= nextPriorityLevel) {
            // We must reset the current unit of work pointer so that we restart the
            // search from the root during the next tick, in case there is now higher
            // priority work somewhere earlier than before.
            nextUnitOfWork = null;
        }

        {
            if (!isErrorRecovery && fiber.tag === ClassComponent$5) {
                var instance = fiber.stateNode;
                warnAboutInvalidUpdates(instance);
            }
        }

        var node = fiber;
        var shouldContinue = true;
        while (node !== null && shouldContinue) {
            // Walk the parent path to the root and update each node's priority. Once
            // we reach a node whose priority matches (and whose alternate's priority
            // matches) we can exit safely knowing that the rest of the path is correct.
            shouldContinue = false;
            if (node.pendingWorkPriority === NoWork$2 || node.pendingWorkPriority > priorityLevel) {
                // Priority did not match. Update and keep going.
                shouldContinue = true;
                node.pendingWorkPriority = priorityLevel;
            }
            if (node.alternate !== null) {
                if (node.alternate.pendingWorkPriority === NoWork$2 || node.alternate.pendingWorkPriority > priorityLevel) {
                    // Priority did not match. Update and keep going.
                    shouldContinue = true;
                    node.alternate.pendingWorkPriority = priorityLevel;
                }
            }
            if (node['return'] === null) {
                if (node.tag === HostRoot$6) {
                    var root = node.stateNode;
                    scheduleRoot(root, priorityLevel);
                    if (!isPerformingWork) {
                        switch (priorityLevel) {
                            case SynchronousPriority$1:
                                // Perform this update now.
                                if (isUnbatchingUpdates) {
                                    // We're inside unbatchedUpdates, which is inside either
                                    // batchedUpdates or a lifecycle. We should only flush
                                    // synchronous work, not task work.
                                    performWork(SynchronousPriority$1, null);
                                } else {
                                    // Flush both synchronous and task work.
                                    performWork(TaskPriority$1, null);
                                }
                                break;
                            case TaskPriority$1:
                                break;
                            default:
                                // Schedule a callback to perform the work later.
                                if (!isCallbackScheduled) {
                                    scheduleDeferredCallback(performDeferredWork);
                                    isCallbackScheduled = true;
                                }
                        }
                    }
                } else {

                    return;
                }
            }
            node = node['return'];
        }
    }

    function getPriorityContext(fiber, forceAsync) {
        var priorityLevel = priorityContext;
        if (priorityLevel === NoWork$2) {
            if (!useSyncScheduling || fiber.internalContextTag & AsyncUpdates || forceAsync) {
                priorityLevel = LowPriority;
            } else {
                priorityLevel = SynchronousPriority$1;
            }
        }

        // If we're in a batch, or if we're already performing work, downgrade sync
        // priority to task priority
        if (priorityLevel === SynchronousPriority$1 && (isPerformingWork || isBatchingUpdates)) {
            return TaskPriority$1;
        }
        return priorityLevel;
    }

    function scheduleErrorRecovery(fiber) {
        scheduleUpdateImpl(fiber, TaskPriority$1, true);
    }

    function batchedUpdates(fn, a) {
        var previousIsBatchingUpdates = isBatchingUpdates;
        isBatchingUpdates = true;
        try {
            return fn(a);
        } finally {
            isBatchingUpdates = previousIsBatchingUpdates;
            // If we're not already inside a batch, we need to flush any task work
            // that was created by the user-provided function.
            if (!isPerformingWork && !isBatchingUpdates) {
                performWork(TaskPriority$1, null);
            }
        }
    }

    function unbatchedUpdates(fn) {
        var previousIsUnbatchingUpdates = isUnbatchingUpdates;
        var previousIsBatchingUpdates = isBatchingUpdates;
        // This is only true if we're nested inside batchedUpdates.
        isUnbatchingUpdates = isBatchingUpdates;
        isBatchingUpdates = false;
        try {
            return fn();
        } finally {
            isBatchingUpdates = previousIsBatchingUpdates;
            isUnbatchingUpdates = previousIsUnbatchingUpdates;
        }
    }

    function flushSync(batch) {
        var previousIsBatchingUpdates = isBatchingUpdates;
        var previousPriorityContext = priorityContext;
        isBatchingUpdates = true;
        priorityContext = SynchronousPriority$1;
        try {
            return batch();
        } finally {
            isBatchingUpdates = previousIsBatchingUpdates;
            priorityContext = previousPriorityContext;

            performWork(TaskPriority$1, null);
        }
    }

    function deferredUpdates(fn) {
        var previousPriorityContext = priorityContext;
        priorityContext = LowPriority;
        try {
            return fn();
        } finally {
            priorityContext = previousPriorityContext;
        }
    }

    return {
        scheduleUpdate: scheduleUpdate,
        getPriorityContext: getPriorityContext,
        batchedUpdates: batchedUpdates,
        unbatchedUpdates: unbatchedUpdates,
        flushSync: flushSync,
        deferredUpdates: deferredUpdates
    };
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule getContextForSubtree
 * 
 */






var getContextFiber = function (arg) {
};

function getContextForSubtree(parentComponent) {
    if (!parentComponent) {
        return emptyObject;
    }

    var instance = UmdInstanceMap_1.get(parentComponent);
    if (typeof instance.tag === 'number') {
        return getContextFiber(instance);
    } else {
        return instance._processChildContext(instance._context);
    }
}

getContextForSubtree._injectFiber = function (fn) {
    getContextFiber = fn;
};

var getContextForSubtree_1 = getContextForSubtree;

var addTopLevelUpdate = UmdFiberUpdateQueue.addTopLevelUpdate;

var findCurrentUnmaskedContext = UmdFiberContext.findCurrentUnmaskedContext;
var isContextProvider = UmdFiberContext.isContextProvider;
var processChildContext = UmdFiberContext.processChildContext;

var createFiberRoot = UmdFiberRoot.createFiberRoot;



var HostComponent$3 = UmdTypeOfWork.HostComponent;

{


    var UmdDebugCurrentFiber$1 = UmdDebugCurrentFiber_1;
    var getComponentName$4 = getComponentName_1;
}

var findCurrentHostFiber$1 = UmdFiberTreeReflection.findCurrentHostFiber;
var findCurrentHostFiberWithNoPortals$1 = UmdFiberTreeReflection.findCurrentHostFiberWithNoPortals;



getContextForSubtree_1._injectFiber(function (fiber) {
    var parentContext = findCurrentUnmaskedContext(fiber);
    return isContextProvider(fiber) ? processChildContext(fiber, parentContext, false) : parentContext;
});

var UmdFiberReconciler = function (config) {
    var getPublicInstance = config.getPublicInstance;

    var _UmdFiberScheduler = UmdFiberScheduler(config),
        scheduleUpdate = _UmdFiberScheduler.scheduleUpdate,
        getPriorityContext = _UmdFiberScheduler.getPriorityContext,
        batchedUpdates = _UmdFiberScheduler.batchedUpdates,
        unbatchedUpdates = _UmdFiberScheduler.unbatchedUpdates,
        flushSync = _UmdFiberScheduler.flushSync,
        deferredUpdates = _UmdFiberScheduler.deferredUpdates;

    function scheduleTopLevelUpdate(current, element, callback) {

        // Check if the top-level element is an async wrapper component. If so, treat
        // updates to the root as async. This is a bit weird but lets us avoid a separate
        // `renderAsync` API.
        var forceAsync = UmdFeatureFlags_1.enableAsyncSubtreeAPI && element != null && element.type != null && element.type.prototype != null && element.type.prototype.unstable_isAsyncUmdComponent === true;
        var priorityLevel = getPriorityContext(current, forceAsync);
        var nextState = { element: element };
        callback = callback === undefined ? null : callback;

        addTopLevelUpdate(current, nextState, callback, priorityLevel);
        scheduleUpdate(current, priorityLevel);
    }

    return {
        createContainer: function (containerInfo) {
            return createFiberRoot(containerInfo);
        },
        updateContainer: function (element, container, parentComponent, callback) {
            // TODO: If this is a nested container, this won't be the root.
            var current = container.current;



            var context = getContextForSubtree_1(parentComponent);
            if (container.context === null) {
                container.context = context;
            } else {
                container.pendingContext = context;
            }

            scheduleTopLevelUpdate(current, element, callback);
        },


        batchedUpdates: batchedUpdates,

        unbatchedUpdates: unbatchedUpdates,

        deferredUpdates: deferredUpdates,

        flushSync: flushSync,

        getPublicRootInstance: function (container) {
            var containerFiber = container.current;
            if (!containerFiber.child) {
                return null;
            }
            switch (containerFiber.child.tag) {
                case HostComponent$3:
                    return getPublicInstance(containerFiber.child.stateNode);
                default:
                    return containerFiber.child.stateNode;
            }
        },
        findHostInstance: function (fiber) {
            var hostFiber = findCurrentHostFiber$1(fiber);
            if (hostFiber === null) {
                return null;
            }
            return hostFiber.stateNode;
        },
        findHostInstanceWithNoPortals: function (fiber) {
            var hostFiber = findCurrentHostFiberWithNoPortals$1(fiber);
            if (hostFiber === null) {
                return null;
            }
            return hostFiber.stateNode;
        }
    };
};

var TEXT_NODE$3 = HTMLNodeType_1.TEXT_NODE;

/**
 * Given any node return the first leaf node without children.
 *
 * @param {DOMElement|DOMTextNode} node
 * @return {DOMElement|DOMTextNode}
 */


function getLeafNode(node) {
    while (node && node.firstChild) {
        node = node.firstChild;
    }
    return node;
}

/**
 * Get the next sibling within a container. This will walk up the
 * DOM if a node's siblings have been exhausted.
 *
 * @param {DOMElement|DOMTextNode} node
 * @return {?DOMElement|DOMTextNode}
 */
function getSiblingNode(node) {
    while (node) {
        if (node.nextSibling) {
            return node.nextSibling;
        }
        node = node.parentNode;
    }
}

/**
 * Get object describing the nodes which contain characters at offset.
 *
 * @param {DOMElement|DOMTextNode} root
 * @param {number} offset
 * @return {?object}
 */
function getNodeForCharacterOffset(root, offset) {
    var node = getLeafNode(root);
    var nodeStart = 0;
    var nodeEnd = 0;

    while (node) {
        if (node.nodeType === TEXT_NODE$3) {
            nodeEnd = nodeStart + node.textContent.length;

            if (nodeStart <= offset && nodeEnd >= offset) {
                return {
                    node: node,
                    offset: offset - nodeStart
                };
            }

            nodeStart = nodeEnd;
        }

        node = getLeafNode(getSiblingNode(node));
    }
}

var getNodeForCharacterOffset_1 = getNodeForCharacterOffset;

var contentKey = null;

/**
 * Gets the key used to access text content on a DOM node.
 *
 * @return {?string} Key used to access text content.
 * @internal
 */
function getTextContentAccessor() {
    if (!contentKey && ExecutionEnvironment.canUseDOM) {
        // Prefer textContent to innerText because many browsers support both but
        // SVG <text> elements don't support innerText even when <div> does.
        contentKey = 'textContent' in document.documentElement ? 'textContent' : 'innerText';
    }
    return contentKey;
}

var getTextContentAccessor_1 = getTextContentAccessor;

/**
 * While `isCollapsed` is available on the Selection object and `collapsed`
 * is available on the Range object, IE11 sometimes gets them wrong.
 * If the anchor/focus nodes and offsets are the same, the range is collapsed.
 */
function isCollapsed(anchorNode, anchorOffset, focusNode$$1, focusOffset) {
    return anchorNode === focusNode$$1 && anchorOffset === focusOffset;
}

/**
 * @param {DOMElement} node
 * @return {?object}
 */
function getModernOffsets(node) {
    var selection = window.getSelection && window.getSelection();

    if (!selection || selection.rangeCount === 0) {
        return null;
    }

    var anchorNode = selection.anchorNode;
    var anchorOffset = selection.anchorOffset;
    var focusNode$$1 = selection.focusNode;
    var focusOffset = selection.focusOffset;

    var currentRange = selection.getRangeAt(0);

    // In Firefox, range.startContainer and range.endContainer can be "anonymous
    // divs", e.g. the up/down buttons on an <input type="number">. Anonymous
    // divs do not seem to expose properties, triggering a "Permission denied
    // error" if any of its properties are accessed. The only seemingly possible
    // way to avoid erroring is to access a property that typically works for
    // non-anonymous divs and catch any error that may otherwise arise. See
    // https://bugzilla.mozilla.org/show_bug.cgi?id=208427
    try {
        /* eslint-disable no-unused-expressions */
        currentRange.startContainer.nodeType;
        currentRange.endContainer.nodeType;
        /* eslint-enable no-unused-expressions */
    } catch (e) {
        return null;
    }

    // If the node and offset values are the same, the selection is collapsed.
    // `Selection.isCollapsed` is available natively, but IE sometimes gets
    // this value wrong.
    var isSelectionCollapsed = isCollapsed(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);

    var rangeLength = isSelectionCollapsed ? 0 : currentRange.toString().length;

    var tempRange = currentRange.cloneRange();
    tempRange.selectNodeContents(node);
    tempRange.setEnd(currentRange.startContainer, currentRange.startOffset);

    var isTempRangeCollapsed = isCollapsed(tempRange.startContainer, tempRange.startOffset, tempRange.endContainer, tempRange.endOffset);

    var start = isTempRangeCollapsed ? 0 : tempRange.toString().length;
    var end = start + rangeLength;

    // Detect whether the selection is backward.
    var detectionRange = document.createRange();
    detectionRange.setStart(anchorNode, anchorOffset);
    detectionRange.setEnd(focusNode$$1, focusOffset);
    var isBackward = detectionRange.collapsed;

    return {
        start: isBackward ? end : start,
        end: isBackward ? start : end
    };
}

/**
 * In modern non-IE browsers, we can support both forward and backward
 * selections.
 *
 * Note: IE10+ supports the Selection object, but it does not support
 * the `extend` method, which means that even in modern IE, it's not possible
 * to programmatically create a backward selection. Thus, for all IE
 * versions, we use the old IE API to create our selections.
 *
 * @param {DOMElement|DOMTextNode} node
 * @param {object} offsets
 */
function setModernOffsets(node, offsets) {
    if (!window.getSelection) {
        return;
    }

    var selection = window.getSelection();
    var length = node[getTextContentAccessor_1()].length;
    var start = Math.min(offsets.start, length);
    var end = offsets.end === undefined ? start : Math.min(offsets.end, length);

    // IE 11 uses modern selection, but doesn't support the extend method.
    // Flip backward selections, so we can set with a single range.
    if (!selection.extend && start > end) {
        var temp = end;
        end = start;
        start = temp;
    }

    var startMarker = getNodeForCharacterOffset_1(node, start);
    var endMarker = getNodeForCharacterOffset_1(node, end);

    if (startMarker && endMarker) {
        var range = document.createRange();
        range.setStart(startMarker.node, startMarker.offset);
        selection.removeAllRanges();

        if (start > end) {
            selection.addRange(range);
            selection.extend(endMarker.node, endMarker.offset);
        } else {
            range.setEnd(endMarker.node, endMarker.offset);
            selection.addRange(range);
        }
    }
}

var UmdDOMSelection = {
    /**
     * @param {DOMElement} node
     */
    getOffsets: getModernOffsets,

    /**
     * @param {DOMElement|DOMTextNode} node
     * @param {object} offsets
     */
    setOffsets: setModernOffsets
};

var UmdDOMSelection_1 = UmdDOMSelection;

var ELEMENT_NODE$2 = HTMLNodeType_1.ELEMENT_NODE;





function isInDocument(node) {
    return containsNode(document.documentElement, node);
}

/**
 * @UmdInputSelection: Umd input selection module. Based on Selection.js,
 * but modified to be suitable for umd and has a couple of bug fixes (doesn't
 * assume buttons have range selections allowed).
 * Input selection module for Umd.
 */
var UmdInputSelection = {
    hasSelectionCapabilities: function (elem) {
        var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
        return nodeName && (nodeName === 'input' && elem.type === 'text' || nodeName === 'textarea' || elem.contentEditable === 'true');
    },

    getSelectionInformation: function () {
        var focusedElem = getActiveElement();
        return {
            focusedElem: focusedElem,
            selectionRange: UmdInputSelection.hasSelectionCapabilities(focusedElem) ? UmdInputSelection.getSelection(focusedElem) : null
        };
    },

    /**
     * @restoreSelection: If any selection information was potentially lost,
     * restore it. This is useful when performing operations that could remove dom
     * nodes and place them back in, resulting in focus being lost.
     */
    restoreSelection: function (priorSelectionInformation) {
        var curFocusedElem = getActiveElement();
        var priorFocusedElem = priorSelectionInformation.focusedElem;
        var priorSelectionRange = priorSelectionInformation.selectionRange;
        if (curFocusedElem !== priorFocusedElem && isInDocument(priorFocusedElem)) {
            if (UmdInputSelection.hasSelectionCapabilities(priorFocusedElem)) {
                UmdInputSelection.setSelection(priorFocusedElem, priorSelectionRange);
            }

            // Focusing a node can change the scroll position, which is undesirable
            var ancestors = [];
            var ancestor = priorFocusedElem;
            while (ancestor = ancestor.parentNode) {
                if (ancestor.nodeType === ELEMENT_NODE$2) {
                    ancestors.push({
                        element: ancestor,
                        left: ancestor.scrollLeft,
                        top: ancestor.scrollTop
                    });
                }
            }

            focusNode(priorFocusedElem);

            for (var i = 0; i < ancestors.length; i++) {
                var info = ancestors[i];
                info.element.scrollLeft = info.left;
                info.element.scrollTop = info.top;
            }
        }
    },

    /**
     * @getSelection: Gets the selection bounds of a focused textarea, input or
     * contentEditable node.
     * -@input: Look up selection bounds of this input
     * -@return {start: selectionStart, end: selectionEnd}
     */
    getSelection: function (input) {
        var selection;

        if ('selectionStart' in input) {
            // Modern browser with input or textarea.
            selection = {
                start: input.selectionStart,
                end: input.selectionEnd
            };
        } else {
            // Content editable or old IE textarea.
            selection = UmdDOMSelection_1.getOffsets(input);
        }

        return selection || { start: 0, end: 0 };
    },

    /**
     * @setSelection: Sets the selection bounds of a textarea or input and focuses
     * the input.
     * -@input     Set selection bounds of this input or textarea
     * -@offsets   Object of same form that is returned from get*
     */
    setSelection: function (input, offsets) {
        var start = offsets.start;
        var end = offsets.end;
        if (end === undefined) {
            end = start;
        }

        if ('selectionStart' in input) {
            input.selectionStart = start;
            input.selectionEnd = Math.min(end, input.value.length);
        } else {
            UmdDOMSelection_1.setOffsets(input, offsets);
        }
    }
};

var UmdInputSelection_1 = UmdInputSelection;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule UmdVersion
 */

var UmdVersion = '16.0.0';

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule findDOMNode
 * 
 */



var ELEMENT_NODE$3 = HTMLNodeType_1.ELEMENT_NODE;

var UmdCurrentOwner$3 = UmdGlobalSharedState_1.UmdCurrentOwner;



var findFiber = function (arg) {
};
var findStack = function (arg) {
};

var findDOMNode = function (componentOrElement) {
    {
        var owner = UmdCurrentOwner$3.current;
        if (owner !== null) {
            var isFiber = typeof owner.tag === 'number';
            var warnedAboutRefsInRender = isFiber ? owner.stateNode._warnedAboutRefsInRender : owner._warnedAboutRefsInRender;
            if (isFiber) {
                owner.stateNode._warnedAboutRefsInRender = true;
            } else {
                owner._warnedAboutRefsInRender = true;
            }
        }
    }
    if (componentOrElement == null) {
        return null;
    }
    if (componentOrElement.nodeType === ELEMENT_NODE$3) {
        return componentOrElement;
    }

    var inst = UmdInstanceMap_1.get(componentOrElement);
    if (inst) {
        if (typeof inst.tag === 'number') {
            return findFiber(inst);
        } else {
            return findStack(inst);
        }
    }


};

findDOMNode._injectFiber = function (fn) {
    findFiber = fn;
};
findDOMNode._injectStack = function (fn) {
    findStack = fn;
};

var findDOMNode_1 = findDOMNode;

var validateDOMNesting$1 = emptyFunction;

{


    var _require$13 = UmdDebugCurrentFiber_1,
        getCurrentFiberStackAddendum$6 = _require$13.getCurrentFiberStackAddendum;

    // This validation code was written based on the HTML5 parsing spec:
    // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
    //
    // Note: this does not catch all invalid nesting, nor does it try to (as it's
    // not clear what practical benefit doing so provides); instead, we warn only
    // for cases where the parser will give a parse tree differing from what Umd
    // intended. For example, <b><div></div></b> is invalid but we don't warn
    // because it still parses correctly; we do warn for other cases like nested
    // <p> tags where the beginning of the second element implicitly closes the
    // first, causing a confusing mess.

    // https://html.spec.whatwg.org/multipage/syntax.html#special


    var specialTags = ['address', 'applet', 'area', 'article', 'aside', 'base', 'basefont', 'bgsound', 'blockquote', 'body', 'br', 'button', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dir', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'iframe', 'img', 'input', 'isindex', 'li', 'link', 'listing', 'main', 'marquee', 'menu', 'menuitem', 'meta', 'nav', 'noembed', 'noframes', 'noscript', 'object', 'ol', 'p', 'param', 'plaintext', 'pre', 'script', 'section', 'select', 'source', 'style', 'summary', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul', 'wbr', 'xmp'];

    // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
    var inScopeTags = ['applet', 'caption', 'html', 'table', 'td', 'th', 'marquee', 'object', 'template',

        // https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
        // TODO: Distinguish by namespace here -- for <title>, including it here
        // errs on the side of fewer warnings
        'foreignObject', 'desc', 'title'];

    // https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope
    var buttonScopeTags = inScopeTags.concat(['button']);

    // https://html.spec.whatwg.org/multipage/syntax.html#generate-implied-end-tags
    var impliedEndTags = ['dd', 'dt', 'li', 'option', 'optgroup', 'p', 'rp', 'rt'];

    var emptyAncestorInfo = {
        current: null,

        formTag: null,
        aTagInScope: null,
        buttonTagInScope: null,
        nobrTagInScope: null,
        pTagInButtonScope: null,

        listItemTagAutoclosing: null,
        dlItemTagAutoclosing: null
    };

    var updatedAncestorInfo$1 = function (oldInfo, tag, instance) {
        var ancestorInfo = _assign({}, oldInfo || emptyAncestorInfo);
        var info = { tag: tag, instance: instance };

        if (inScopeTags.indexOf(tag) !== -1) {
            ancestorInfo.aTagInScope = null;
            ancestorInfo.buttonTagInScope = null;
            ancestorInfo.nobrTagInScope = null;
        }
        if (buttonScopeTags.indexOf(tag) !== -1) {
            ancestorInfo.pTagInButtonScope = null;
        }

        // See rules for 'li', 'dd', 'dt' start tags in
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
        if (specialTags.indexOf(tag) !== -1 && tag !== 'address' && tag !== 'div' && tag !== 'p') {
            ancestorInfo.listItemTagAutoclosing = null;
            ancestorInfo.dlItemTagAutoclosing = null;
        }

        ancestorInfo.current = info;

        if (tag === 'form') {
            ancestorInfo.formTag = info;
        }
        if (tag === 'a') {
            ancestorInfo.aTagInScope = info;
        }
        if (tag === 'button') {
            ancestorInfo.buttonTagInScope = info;
        }
        if (tag === 'nobr') {
            ancestorInfo.nobrTagInScope = info;
        }
        if (tag === 'p') {
            ancestorInfo.pTagInButtonScope = info;
        }
        if (tag === 'li') {
            ancestorInfo.listItemTagAutoclosing = info;
        }
        if (tag === 'dd' || tag === 'dt') {
            ancestorInfo.dlItemTagAutoclosing = info;
        }

        return ancestorInfo;
    };

    /**
     * Returns whether
     */
    var isTagValidWithParent = function (tag, parentTag) {
        // First, let's check if we're in an unusual parsing mode...
        switch (parentTag) {
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
            case 'select':
                return tag === 'option' || tag === 'optgroup' || tag === '#text';
            case 'optgroup':
                return tag === 'option' || tag === '#text';
            // Strictly speaking, seeing an <option> doesn't mean we're in a <select>
            // but
            case 'option':
                return tag === '#text';
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
            // No special behavior since these rules fall back to "in body" mode for
            // all except special table nodes which cause bad parsing behavior anyway.

            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
            case 'tr':
                return tag === 'th' || tag === 'td' || tag === 'style' || tag === 'script' || tag === 'template';
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
            case 'tbody':
            case 'thead':
            case 'tfoot':
                return tag === 'tr' || tag === 'style' || tag === 'script' || tag === 'template';
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
            case 'colgroup':
                return tag === 'col' || tag === 'template';
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
            case 'table':
                return tag === 'caption' || tag === 'colgroup' || tag === 'tbody' || tag === 'tfoot' || tag === 'thead' || tag === 'style' || tag === 'script' || tag === 'template';
            // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
            case 'head':
                return tag === 'base' || tag === 'basefont' || tag === 'bgsound' || tag === 'link' || tag === 'meta' || tag === 'title' || tag === 'noscript' || tag === 'noframes' || tag === 'style' || tag === 'script' || tag === 'template';
            // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
            case 'html':
                return tag === 'head' || tag === 'body';
            case '#document':
                return tag === 'html';
        }

        // Probably in the "in body" parsing mode, so we outlaw only tag combos
        // where the parsing rules cause implicit opens or closes to be added.
        // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
        switch (tag) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return parentTag !== 'h1' && parentTag !== 'h2' && parentTag !== 'h3' && parentTag !== 'h4' && parentTag !== 'h5' && parentTag !== 'h6';

            case 'rp':
            case 'rt':
                return impliedEndTags.indexOf(parentTag) === -1;

            case 'body':
            case 'caption':
            case 'col':
            case 'colgroup':
            case 'frame':
            case 'head':
            case 'html':
            case 'tbody':
            case 'td':
            case 'tfoot':
            case 'th':
            case 'thead':
            case 'tr':
                // These tags are only valid with a few parents that have special child
                // parsing rules -- if we're down here, then none of those matched and
                // so we allow it only if we don't know what the parent is, as all other
                // cases are invalid.
                return parentTag == null;
        }

        return true;
    };

    /**
     * Returns whether
     */
    var findInvalidAncestorForTag = function (tag, ancestorInfo) {
        switch (tag) {
            case 'address':
            case 'article':
            case 'aside':
            case 'blockquote':
            case 'center':
            case 'details':
            case 'dialog':
            case 'dir':
            case 'div':
            case 'dl':
            case 'fieldset':
            case 'figcaption':
            case 'figure':
            case 'footer':
            case 'header':
            case 'hgroup':
            case 'main':
            case 'menu':
            case 'nav':
            case 'ol':
            case 'p':
            case 'section':
            case 'summary':
            case 'ul':
            case 'pre':
            case 'listing':
            case 'table':
            case 'hr':
            case 'xmp':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return ancestorInfo.pTagInButtonScope;

            case 'form':
                return ancestorInfo.formTag || ancestorInfo.pTagInButtonScope;

            case 'li':
                return ancestorInfo.listItemTagAutoclosing;

            case 'dd':
            case 'dt':
                return ancestorInfo.dlItemTagAutoclosing;

            case 'button':
                return ancestorInfo.buttonTagInScope;

            case 'a':
                // Spec says something about storing a list of markers, but it sounds
                // equivalent to this check.
                return ancestorInfo.aTagInScope;

            case 'nobr':
                return ancestorInfo.nobrTagInScope;
        }

        return null;
    };

    /**
     * Given a UmdCompositeComponent instance, return a list of its recursive
     * owners, starting at the root and ending with the instance itself.
     */
    var findOwnerStack = function (instance) {
        if (!instance) {
            return [];
        }

        var stack = [];
        do {
            stack.push(instance);
        } while (instance = instance._currentElement._owner);
        stack.reverse();
        return stack;
    };

    var getOwnerInfo = function (childInstance, childTag, ancestorInstance, ancestorTag, isParent) {
        var childOwner = childInstance && childInstance._currentElement._owner;
        var ancestorOwner = ancestorInstance && ancestorInstance._currentElement._owner;

        var childOwners = findOwnerStack(childOwner);
        var ancestorOwners = findOwnerStack(ancestorOwner);

        var minStackLen = Math.min(childOwners.length, ancestorOwners.length);
        var i;

        var deepestCommon = -1;
        for (i = 0; i < minStackLen; i++) {
            if (childOwners[i] === ancestorOwners[i]) {
                deepestCommon = i;
            } else {
                break;
            }
        }

        var UNKNOWN = '(unknown)';
        var childOwnerNames = childOwners.slice(deepestCommon + 1).map(function (inst) {
            return getComponentName_1(inst) || UNKNOWN;
        });
        var ancestorOwnerNames = ancestorOwners.slice(deepestCommon + 1).map(function (inst) {
            return getComponentName_1(inst) || UNKNOWN;
        });
        var ownerInfo = [].concat(
            // If the parent and child instances have a common owner ancestor, start
            // with that -- otherwise we just start with the parent's owners.
            deepestCommon !== -1 ? getComponentName_1(childOwners[deepestCommon]) || UNKNOWN : [], ancestorOwnerNames, ancestorTag,
            // If we're warning about an invalid (non-parent) ancestry, add '...'
            isParent ? [] : ['...'], childOwnerNames, childTag).join(' > ');

        return ownerInfo;
    };

    var didWarn = {};

    validateDOMNesting$1 = function (childTag, childText, childInstance, ancestorInfo) {
        ancestorInfo = ancestorInfo || emptyAncestorInfo;
        var parentInfo = ancestorInfo.current;
        var parentTag = parentInfo && parentInfo.tag;

        if (childText != null) {
            childTag = '#text';
        }

        var invalidParent = isTagValidWithParent(childTag, parentTag) ? null : parentInfo;
        var invalidAncestor = invalidParent ? null : findInvalidAncestorForTag(childTag, ancestorInfo);
        var invalidParentOrAncestor = invalidParent || invalidAncestor;
        if (!invalidParentOrAncestor) {
            return;
        }

        var ancestorInstance = invalidParentOrAncestor.instance;
        var ancestorTag = invalidParentOrAncestor.tag;
        var addendum;

        if (childInstance != null) {
            addendum = ' See ' + getOwnerInfo(childInstance, childTag, ancestorInstance, ancestorTag, !!invalidParent) + '.';
        } else {
            addendum = getCurrentFiberStackAddendum$6();
        }

        var warnKey = !!invalidParent + '|' + childTag + '|' + ancestorTag + '|' + addendum;
        if (didWarn[warnKey]) {
            return;
        }
        didWarn[warnKey] = true;

        var tagDisplayName = childTag;
        var whitespaceInfo = '';
        if (childTag === '#text') {
            if (/\S/.test(childText)) {
                tagDisplayName = 'Text nodes';
            } else {
                tagDisplayName = 'Whitespace text nodes';
                whitespaceInfo = " Make sure you don't have any extra whitespace between tags on " + 'each line of your source code.';
            }
        } else {
            tagDisplayName = '<' + childTag + '>';
        }

        if (invalidParent) {
            var info = '';
            if (ancestorTag === 'table' && childTag === 'tr') {
                info += ' Add a <tbody> to your code to match the DOM tree generated by ' + 'the browser.';
            }
        } else {
        }
    };

    validateDOMNesting$1.updatedAncestorInfo = updatedAncestorInfo$1;

    // For testing
    validateDOMNesting$1.isTagValidInContext = function (tag, ancestorInfo) {
        ancestorInfo = ancestorInfo || emptyAncestorInfo;
        var parentInfo = ancestorInfo.current;
        var parentTag = parentInfo && parentInfo.tag;
        return isTagValidWithParent(tag, parentTag) && !findInvalidAncestorForTag(tag, ancestorInfo);
    };
}

var validateDOMNesting_1 = validateDOMNesting$1;

var HostComponent$11 = UmdTypeOfWork.HostComponent;

function getParent(inst) {
    if (inst._hostParent !== undefined) {
        return inst._hostParent;
    }
    if (typeof inst.tag === 'number') {
        do {
            inst = inst['return'];
            // TODO: If this is a HostRoot we might want to bail out.
            // That is depending on if we want nested subtrees (layers) to bubble
            // events to their parent. We could also go through parentNode on the
            // host node but that wouldn't work for Umd Native and doesn't let us
            // do the portal feature.
        } while (inst && inst.tag !== HostComponent$11);
        if (inst) {
            return inst;
        }
    }
    return null;
}

/**
 * Return the lowest common ancestor of A and B, or null if they are in
 * different trees.
 */
function getLowestCommonAncestor(instA, instB) {
    var depthA = 0;
    for (var tempA = instA; tempA; tempA = getParent(tempA)) {
        depthA++;
    }
    var depthB = 0;
    for (var tempB = instB; tempB; tempB = getParent(tempB)) {
        depthB++;
    }

    // If A is deeper, crawl up.
    while (depthA - depthB > 0) {
        instA = getParent(instA);
        depthA--;
    }

    // If B is deeper, crawl up.
    while (depthB - depthA > 0) {
        instB = getParent(instB);
        depthB--;
    }

    // Walk in lockstep until we find a match.
    var depth = depthA;
    while (depth--) {
        if (instA === instB || instA === instB.alternate) {
            return instA;
        }
        instA = getParent(instA);
        instB = getParent(instB);
    }
    return null;
}

/**
 * Return if A is an ancestor of B.
 */
function isAncestor(instA, instB) {
    while (instB) {
        if (instA === instB || instA === instB.alternate) {
            return true;
        }
        instB = getParent(instB);
    }
    return false;
}

/**
 * Return the parent instance of the passed-in instance.
 */
function getParentInstance(inst) {
    return getParent(inst);
}

/**
 * Simulates the traversal of a two-phase, capture/bubble event dispatch.
 */
function traverseTwoPhase(inst, fn, arg) {
    var path = [];
    while (inst) {
        path.push(inst);
        inst = getParent(inst);
    }
    var i;
    for (i = path.length; i-- > 0;) {
        fn(path[i], 'captured', arg);
    }
    for (i = 0; i < path.length; i++) {
        fn(path[i], 'bubbled', arg);
    }
}

/**
 * Traverses the ID hierarchy and invokes the supplied `cb` on any IDs that
 * should would receive a `mouseEnter` or `mouseLeave` event.
 *
 * Does not invoke the callback on the nearest common ancestor because nothing
 * "entered" or "left" that element.
 */
function traverseEnterLeave(from, to, fn, argFrom, argTo) {
    var common = from && to ? getLowestCommonAncestor(from, to) : null;
    var pathFrom = [];
    while (from && from !== common) {
        pathFrom.push(from);
        from = getParent(from);
    }
    var pathTo = [];
    while (to && to !== common) {
        pathTo.push(to);
        to = getParent(to);
    }
    var i;
    for (i = 0; i < pathFrom.length; i++) {
        fn(pathFrom[i], 'bubbled', argFrom);
    }
    for (i = pathTo.length; i-- > 0;) {
        fn(pathTo[i], 'captured', argTo);
    }
}

var UmdTreeTraversal = {
    isAncestor: isAncestor,
    getLowestCommonAncestor: getLowestCommonAncestor,
    getParentInstance: getParentInstance,
    traverseTwoPhase: traverseTwoPhase,
    traverseEnterLeave: traverseEnterLeave
};

var getListener = EventPluginHub_1.getListener;



/**
 * Some event types have a notion of different registration names for different
 * "phases" of propagation. This finds listeners by a given phase.
 */
function listenerAtPhase(inst, event, propagationPhase) {
    var registrationName = event.dispatchConfig.phasedRegistrationNames[propagationPhase];
    return getListener(inst, registrationName);
}

/**
 * Tags a `SyntheticEvent` with dispatched listeners. Creating this function
 * here, allows us to not have to bind or create functions for each event.
 * Mutating the event's members allows us to not have to create a wrapping
 * "dispatch" object that pairs the event with the listener.
 */
function accumulateDirectionalDispatches(inst, phase, event) {

    var listener = listenerAtPhase(inst, event, phase);
    if (listener) {
        event._dispatchListeners = accumulateInto_1(event._dispatchListeners, listener);
        event._dispatchInstances = accumulateInto_1(event._dispatchInstances, inst);
    }
}

/**
 * Collect dispatches (must be entirely collected before dispatching - see unit
 * tests). Lazily allocate the array to conserve memory.  We must loop through
 * each event and perform the traversal for each one. We cannot perform a
 * single traversal for the entire collection of events because each event may
 * have a different target.
 */
function accumulateTwoPhaseDispatchesSingle(event) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
        UmdTreeTraversal.traverseTwoPhase(event._targetInst, accumulateDirectionalDispatches, event);
    }
}

/**
 * Same as `accumulateTwoPhaseDispatchesSingle`, but skips over the targetID.
 */
function accumulateTwoPhaseDispatchesSingleSkipTarget(event) {
    if (event && event.dispatchConfig.phasedRegistrationNames) {
        var targetInst = event._targetInst;
        var parentInst = targetInst ? UmdTreeTraversal.getParentInstance(targetInst) : null;
        UmdTreeTraversal.traverseTwoPhase(parentInst, accumulateDirectionalDispatches, event);
    }
}

/**
 * Accumulates without regard to direction, does not look for phased
 * registration names. Same as `accumulateDirectDispatchesSingle` but without
 * requiring that the `dispatchMarker` be the same as the dispatched ID.
 */
function accumulateDispatches(inst, ignoredDirection, event) {
    if (inst && event && event.dispatchConfig.registrationName) {
        var registrationName = event.dispatchConfig.registrationName;
        var listener = getListener(inst, registrationName);
        if (listener) {
            event._dispatchListeners = accumulateInto_1(event._dispatchListeners, listener);
            event._dispatchInstances = accumulateInto_1(event._dispatchInstances, inst);
        }
    }
}

/**
 * Accumulates dispatches on an `SyntheticEvent`, but only for the
 * `dispatchMarker`.
 * @param {SyntheticEvent} event
 */
function accumulateDirectDispatchesSingle(event) {
    if (event && event.dispatchConfig.registrationName) {
        accumulateDispatches(event._targetInst, null, event);
    }
}

function accumulateTwoPhaseDispatches(events) {
    forEachAccumulated_1(events, accumulateTwoPhaseDispatchesSingle);
}

function accumulateTwoPhaseDispatchesSkipTarget(events) {
    forEachAccumulated_1(events, accumulateTwoPhaseDispatchesSingleSkipTarget);
}

function accumulateEnterLeaveDispatches(leave, enter, from, to) {
    UmdTreeTraversal.traverseEnterLeave(from, to, accumulateDispatches, leave, enter);
}

function accumulateDirectDispatches(events) {
    forEachAccumulated_1(events, accumulateDirectDispatchesSingle);
}

/**
 * A small set of propagation patterns, each of which will accept a small amount
 * of information, and generate a set of "dispatch ready event objects" - which
 * are sets of events that have already been annotated with a set of dispatched
 * listener functions/ids. The API is designed this way to discourage these
 * propagation strategies from actually executing the dispatches, since we
 * always want to collect the entire set of dispatches before executing even a
 * single one.
 *
 * @constructor EventPropagators
 */
var EventPropagators = {
    accumulateTwoPhaseDispatches: accumulateTwoPhaseDispatches,
    accumulateTwoPhaseDispatchesSkipTarget: accumulateTwoPhaseDispatchesSkipTarget,
    accumulateDirectDispatches: accumulateDirectDispatches,
    accumulateEnterLeaveDispatches: accumulateEnterLeaveDispatches
};

var EventPropagators_1 = EventPropagators;

/**
 * This helper object stores information about text content of a target node,
 * allowing comparison of content before and after a given event.
 *
 * Identify the node where selection currently begins, then observe
 * both its text content and its current position in the DOM. Since the
 * browser may natively replace the target node during composition, we can
 * use its position to find its replacement.
 * 
 *
 */
var compositionState = {
    _root: null,
    _startText: null,
    _fallbackText: null
};

var FallbackCompositionState = {
    initialize: function (nativeEventTarget) {
        compositionState._root = nativeEventTarget;
        compositionState._startText = FallbackCompositionState.getText();
        return true;
    },
    reset: function () {
        compositionState._root = null;
        compositionState._startText = null;
        compositionState._fallbackText = null;
    },
    getData: function () {
        if (compositionState._fallbackText) {
            return compositionState._fallbackText;
        }

        var start;
        var startValue = compositionState._startText;
        var startLength = startValue.length;
        var end;
        var endValue = FallbackCompositionState.getText();
        var endLength = endValue.length;

        for (start = 0; start < startLength; start++) {
            if (startValue[start] !== endValue[start]) {
                break;
            }
        }

        var minEnd = startLength - start;
        for (end = 1; end <= minEnd; end++) {
            if (startValue[startLength - end] !== endValue[endLength - end]) {
                break;
            }
        }

        var sliceTail = end > 1 ? 1 - end : undefined;
        compositionState._fallbackText = endValue.slice(start, sliceTail);
        return compositionState._fallbackText;
    },
    getText: function () {
        if ('value' in compositionState._root) {
            return compositionState._root.value;
        }
        return compositionState._root[getTextContentAccessor_1()];
    }
};

var FallbackCompositionState_1 = FallbackCompositionState;

var didWarnForAddedNewProperty = false;
var isProxySupported = typeof Proxy === 'function';
var EVENT_POOL_SIZE = 10;


var shouldBeReleasedProperties = ['dispatchConfig', '_targetInst', 'nativeEvent', 'isDefaultPrevented', 'isPropagationStopped', '_dispatchListeners', '_dispatchInstances'];

/**
 * @interface Event
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var EventInterface = {
    type: null,
    target: null,
    // currentTarget is set when dispatching; no use in copying it here
    currentTarget: emptyFunction.thatReturnsNull,
    eventPhase: null,
    bubbles: null,
    cancelable: null,
    timeStamp: function (event) {
        return event.timeStamp || Date.now();
    },
    defaultPrevented: null,
    isTrusted: null
};

/**
 * Synthetic events are dispatched by event plugins, typically in response to a
 * top-level event delegation handler.
 *
 * These systems should generally use pooling to reduce the frequency of garbage
 * collection. The system should check `isPersistent` to determine whether the
 * event should be released into the pool after being dispatched. Users that
 * need a persisted event should invoke `persist`.
 *
 * Synthetic events (and subclasses) implement the DOM Level 3 Events API by
 * normalizing browser quirks. Subclasses do not necessarily have to implement a
 * DOM interface; custom application-specific events can also subclass this.
 *
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {*} targetInst Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @param {DOMEventTarget} nativeEventTarget Target node.
 */
function SyntheticEvent(dispatchConfig, targetInst, nativeEvent, nativeEventTarget) {
    {
        // these have a getter/setter for warnings
        delete this.nativeEvent;
        delete this.preventDefault;
        delete this.stopPropagation;
    }

    this.dispatchConfig = dispatchConfig;
    this._targetInst = targetInst;
    this.nativeEvent = nativeEvent;

    var Interface = this.constructor.Interface;
    for (var propName in Interface) {
        if (!Interface.hasOwnProperty(propName)) {
            continue;
        }
        {
            delete this[propName]; // this has a getter/setter for warnings
        }
        var normalize = Interface[propName];
        if (normalize) {
            this[propName] = normalize(nativeEvent);
        } else {
            if (propName === 'target') {
                this.target = nativeEventTarget;
            } else {
                this[propName] = nativeEvent[propName];
            }
        }
    }

    var defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;
    if (defaultPrevented) {
        this.isDefaultPrevented = emptyFunction.thatReturnsTrue;
    } else {
        this.isDefaultPrevented = emptyFunction.thatReturnsFalse;
    }
    this.isPropagationStopped = emptyFunction.thatReturnsFalse;
    return this;
}

_assign(SyntheticEvent.prototype, {
    preventDefault: function () {
        this.defaultPrevented = true;
        var event = this.nativeEvent;
        if (!event) {
            return;
        }

        if (event.preventDefault) {
            event.preventDefault();
        } else if (typeof event.returnValue !== 'unknown') {
            event.returnValue = false;
        }
        this.isDefaultPrevented = emptyFunction.thatReturnsTrue;
    },

    stopPropagation: function () {
        var event = this.nativeEvent;
        if (!event) {
            return;
        }

        if (event.stopPropagation) {
            event.stopPropagation();
        } else if (typeof event.cancelBubble !== 'unknown') {
            // The ChangeEventPlugin registers a "propertychange" event for
            // IE. This event does not support bubbling or cancelling, and
            // any references to cancelBubble throw "Member not found".  A
            // typeof check of "unknown" circumvents this issue (and is also
            // IE specific).
            event.cancelBubble = true;
        }

        this.isPropagationStopped = emptyFunction.thatReturnsTrue;
    },

    /**
     * We release all dispatched `SyntheticEvent`s after each event loop, adding
     * them back into the pool. This allows a way to hold onto a reference that
     * won't be added back into the pool.
     */
    persist: function () {
        this.isPersistent = emptyFunction.thatReturnsTrue;
    },

    /**
     * Checks if this event should be released back into the pool.
     *
     * @return {boolean} True if this should not be released, false otherwise.
     */
    isPersistent: emptyFunction.thatReturnsFalse,

    /**
     * `PooledClass` looks for `destructor` on each instance it releases.
     */
    destructor: function () {
        var Interface = this.constructor.Interface;
        for (var propName in Interface) {
            {
                Object.defineProperty(this, propName, getPooledWarningPropertyDefinition(propName, Interface[propName]));
            }
        }
        for (var i = 0; i < shouldBeReleasedProperties.length; i++) {
            this[shouldBeReleasedProperties[i]] = null;
        }
        {
            Object.defineProperty(this, 'nativeEvent', getPooledWarningPropertyDefinition('nativeEvent', null));
            Object.defineProperty(this, 'preventDefault', getPooledWarningPropertyDefinition('preventDefault', emptyFunction));
            Object.defineProperty(this, 'stopPropagation', getPooledWarningPropertyDefinition('stopPropagation', emptyFunction));
        }
    }
});

SyntheticEvent.Interface = EventInterface;

/**
 * Helper to reduce boilerplate when creating subclasses.
 *
 * @param {function} Class
 * @param {?object} Interface
 */
SyntheticEvent.augmentClass = function (Class, Interface) {
    var Super = this;

    var E = function () { };
    E.prototype = Super.prototype;
    var prototype = new E();

    _assign(prototype, Class.prototype);
    Class.prototype = prototype;
    Class.prototype.constructor = Class;

    Class.Interface = _assign({}, Super.Interface, Interface);
    Class.augmentClass = Super.augmentClass;
    addEventPoolingTo(Class);
};

/** Proxying after everything set on SyntheticEvent
  * to resolve Proxy issue on some WebKit browsers
  * in which some Event properties are set to undefined (GH#10010)
  */
{
    if (isProxySupported) {
        /*eslint-disable no-func-assign */
        SyntheticEvent = new Proxy(SyntheticEvent, {
            construct: function (target, args) {
                return this.apply(target, Object.create(target.prototype), args);
            },
            apply: function (constructor, that, args) {
                return new Proxy(constructor.apply(that, args), {
                    set: function (target, prop, value) {
                        if (prop !== 'isPersistent' && !target.constructor.Interface.hasOwnProperty(prop) && shouldBeReleasedProperties.indexOf(prop) === -1) {
                            didWarnForAddedNewProperty = true;
                        }
                        target[prop] = value;
                        return true;
                    }
                });
            }
        });
        /*eslint-enable no-func-assign */
    }
}

addEventPoolingTo(SyntheticEvent);

var SyntheticEvent_1 = SyntheticEvent;

/**
  * Helper to nullify syntheticEvent instance properties when destructing
  *
  * @param {String} propName
  * @param {?object} getVal
  * @return {object} defineProperty object
  */
function getPooledWarningPropertyDefinition(propName, getVal) {
    var isFunction = typeof getVal === 'function';
    return {
        configurable: true,
        set: set,
        get: get
    };

    function set(val) {
        var action = isFunction ? 'setting the method' : 'setting the property';
        warn(action, 'This is effectively a no-op');
        return val;
    }

    function get() {
        var action = isFunction ? 'accessing the method' : 'accessing the property';
        var result = isFunction ? 'This is a no-op function' : 'This is set to null';
        warn(action, result);
        return getVal;
    }

    function warn(action, result) {
        var warningCondition = false;
    }
}

function getPooledEvent(dispatchConfig, targetInst, nativeEvent, nativeInst) {
    var EventConstructor = this;
    if (EventConstructor.eventPool.length) {
        var instance = EventConstructor.eventPool.pop();
        EventConstructor.call(instance, dispatchConfig, targetInst, nativeEvent, nativeInst);
        return instance;
    }
    return new EventConstructor(dispatchConfig, targetInst, nativeEvent, nativeInst);
}

function releasePooledEvent(event) {
    var EventConstructor = this;
    event.destructor();
    if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
        EventConstructor.eventPool.push(event);
    }
}

function addEventPoolingTo(EventConstructor) {
    EventConstructor.eventPool = [];
    EventConstructor.getPooled = getPooledEvent;
    EventConstructor.release = releasePooledEvent;
}

/**
 * @interface Event
 * @see http://www.w3.org/TR/DOM-Level-3-Events/#events-compositionevents
 */
var CompositionEventInterface = {
    data: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticCompositionEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticEvent_1.augmentClass(SyntheticCompositionEvent, CompositionEventInterface);

var SyntheticCompositionEvent_1 = SyntheticCompositionEvent;

/**
 * @interface Event
 * @see http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105
 *      /#events-inputevents
 */
var InputEventInterface = {
    data: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticInputEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticEvent_1.augmentClass(SyntheticInputEvent, InputEventInterface);

var SyntheticInputEvent_1 = SyntheticInputEvent;

var END_KEYCODES = [9, 13, 27, 32]; // Tab, Return, Esc, Space
var START_KEYCODE = 229;

var canUseCompositionEvent = ExecutionEnvironment.canUseDOM && 'CompositionEvent' in window;

var documentMode = null;
if (ExecutionEnvironment.canUseDOM && 'documentMode' in document) {
    documentMode = document.documentMode;
}

// Webkit offers a very useful `textInput` event that can be used to
// directly represent `beforeInput`. The IE `textinput` event is not as
// useful, so we don't use it.
var canUseTextInputEvent = ExecutionEnvironment.canUseDOM && 'TextEvent' in window && !documentMode && !isPresto();

// In IE9+, we have access to composition events, but the data supplied
// by the native compositionend event may be incorrect. Japanese ideographic
// spaces, for instance (\u3000) are not recorded correctly.
var useFallbackCompositionData = ExecutionEnvironment.canUseDOM && (!canUseCompositionEvent || documentMode && documentMode > 8 && documentMode <= 11);

/**
 * Opera <= 12 includes TextEvent in window, but does not fire
 * text input events. Rely on keypress instead.
 */
function isPresto() {
    var opera = window.opera;
    return typeof opera === 'object' && typeof opera.version === 'function' && parseInt(opera.version(), 10) <= 12;
}

var SPACEBAR_CODE = 32;
var SPACEBAR_CHAR = String.fromCharCode(SPACEBAR_CODE);

// Events and their corresponding property names.
var eventTypes = {
    beforeInput: {
        phasedRegistrationNames: {
            bubbled: 'onBeforeInput',
            captured: 'onBeforeInputCapture'
        },
        dependencies: ['topCompositionEnd', 'topKeyPress', 'topTextInput', 'topPaste']
    },
    compositionEnd: {
        phasedRegistrationNames: {
            bubbled: 'onCompositionEnd',
            captured: 'onCompositionEndCapture'
        },
        dependencies: ['topBlur', 'topCompositionEnd', 'topKeyDown', 'topKeyPress', 'topKeyUp', 'topMouseDown']
    },
    compositionStart: {
        phasedRegistrationNames: {
            bubbled: 'onCompositionStart',
            captured: 'onCompositionStartCapture'
        },
        dependencies: ['topBlur', 'topCompositionStart', 'topKeyDown', 'topKeyPress', 'topKeyUp', 'topMouseDown']
    },
    compositionUpdate: {
        phasedRegistrationNames: {
            bubbled: 'onCompositionUpdate',
            captured: 'onCompositionUpdateCapture'
        },
        dependencies: ['topBlur', 'topCompositionUpdate', 'topKeyDown', 'topKeyPress', 'topKeyUp', 'topMouseDown']
    }
};

// Track whether we've ever handled a keypress on the space key.
var hasSpaceKeypress = false;

/**
 * Return whether a native keypress event is assumed to be a command.
 * This is required because Firefox fires `keypress` events for key commands
 * (cut, copy, select-all, etc.) even though no character is inserted.
 */
function isKeypressCommand(nativeEvent) {
    return (nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) &&
        // ctrlKey && altKey is equivalent to AltGr, and is not a command.
        !(nativeEvent.ctrlKey && nativeEvent.altKey);
}

/**
 * Translate native top level events into event types.
 *
 * @param {string} topLevelType
 * @return {object}
 */
function getCompositionEventType(topLevelType) {
    switch (topLevelType) {
        case 'topCompositionStart':
            return eventTypes.compositionStart;
        case 'topCompositionEnd':
            return eventTypes.compositionEnd;
        case 'topCompositionUpdate':
            return eventTypes.compositionUpdate;
    }
}

/**
 * Does our fallback best-guess model think this event signifies that
 * composition has begun?
 *
 * @param {string} topLevelType
 * @param {object} nativeEvent
 * @return {boolean}
 */
function isFallbackCompositionStart(topLevelType, nativeEvent) {
    return topLevelType === 'topKeyDown' && nativeEvent.keyCode === START_KEYCODE;
}

/**
 * Does our fallback mode think that this event is the end of composition?
 *
 * @param {string} topLevelType
 * @param {object} nativeEvent
 * @return {boolean}
 */
function isFallbackCompositionEnd(topLevelType, nativeEvent) {
    switch (topLevelType) {
        case 'topKeyUp':
            // Command keys insert or clear IME input.
            return END_KEYCODES.indexOf(nativeEvent.keyCode) !== -1;
        case 'topKeyDown':
            // Expect IME keyCode on each keydown. If we get any other
            // code we must have exited earlier.
            return nativeEvent.keyCode !== START_KEYCODE;
        case 'topKeyPress':
        case 'topMouseDown':
        case 'topBlur':
            // Events are not possible without cancelling IME.
            return true;
        default:
            return false;
    }
}

/**
 * Google Input Tools provides composition data via a CustomEvent,
 * with the `data` property populated in the `detail` object. If this
 * is available on the event object, use it. If not, this is a plain
 * composition event and we have nothing special to extract.
 *
 * @param {object} nativeEvent
 * @return {?string}
 */
function getDataFromCustomEvent(nativeEvent) {
    var detail = nativeEvent.detail;
    if (typeof detail === 'object' && 'data' in detail) {
        return detail.data;
    }
    return null;
}

// Track the current IME composition status, if any.
var isComposing = false;

/**
 * @return {?object} A SyntheticCompositionEvent.
 */
function extractCompositionEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget) {
    var eventType;
    var fallbackData;

    if (canUseCompositionEvent) {
        eventType = getCompositionEventType(topLevelType);
    } else if (!isComposing) {
        if (isFallbackCompositionStart(topLevelType, nativeEvent)) {
            eventType = eventTypes.compositionStart;
        }
    } else if (isFallbackCompositionEnd(topLevelType, nativeEvent)) {
        eventType = eventTypes.compositionEnd;
    }

    if (!eventType) {
        return null;
    }

    if (useFallbackCompositionData) {
        // The current composition is stored statically and must not be
        // overwritten while composition continues.
        if (!isComposing && eventType === eventTypes.compositionStart) {
            isComposing = FallbackCompositionState_1.initialize(nativeEventTarget);
        } else if (eventType === eventTypes.compositionEnd) {
            if (isComposing) {
                fallbackData = FallbackCompositionState_1.getData();
            }
        }
    }

    var event = SyntheticCompositionEvent_1.getPooled(eventType, targetInst, nativeEvent, nativeEventTarget);

    if (fallbackData) {
        // Inject data generated from fallback path into the synthetic event.
        // This matches the property of native CompositionEventInterface.
        event.data = fallbackData;
    } else {
        var customData = getDataFromCustomEvent(nativeEvent);
        if (customData !== null) {
            event.data = customData;
        }
    }

    EventPropagators_1.accumulateTwoPhaseDispatches(event);
    return event;
}

/**
 * @param {TopLevelTypes} topLevelType Record from `BrowserEventConstants`.
 * @param {object} nativeEvent Native browser event.
 * @return {?string} The string corresponding to this `beforeInput` event.
 */
function getNativeBeforeInputChars(topLevelType, nativeEvent) {
    switch (topLevelType) {
        case 'topCompositionEnd':
            return getDataFromCustomEvent(nativeEvent);
        case 'topKeyPress':
            /**
             * If native `textInput` events are available, our goal is to make
             * use of them. However, there is a special case: the spacebar key.
             * In Webkit, preventing default on a spacebar `textInput` event
             * cancels character insertion, but it *also* causes the browser
             * to fall back to its default spacebar behavior of scrolling the
             * page.
             *
             * Tracking at:
             * https://code.google.com/p/chromium/issues/detail?id=355103
             *
             * To avoid this issue, use the keypress event as if no `textInput`
             * event is available.
             */
            var which = nativeEvent.which;
            if (which !== SPACEBAR_CODE) {
                return null;
            }

            hasSpaceKeypress = true;
            return SPACEBAR_CHAR;

        case 'topTextInput':
            // Record the characters to be added to the DOM.
            var chars = nativeEvent.data;

            // If it's a spacebar character, assume that we have already handled
            // it at the keypress level and bail immediately. Android Chrome
            // doesn't give us keycodes, so we need to blacklist it.
            if (chars === SPACEBAR_CHAR && hasSpaceKeypress) {
                return null;
            }

            return chars;

        default:
            // For other native event types, do nothing.
            return null;
    }
}

/**
 * For browsers that do not provide the `textInput` event, extract the
 * appropriate string to use for SyntheticInputEvent.
 *
 * @param {string} topLevelType Record from `BrowserEventConstants`.
 * @param {object} nativeEvent Native browser event.
 * @return {?string} The fallback string for this `beforeInput` event.
 */
function getFallbackBeforeInputChars(topLevelType, nativeEvent) {
    // If we are currently composing (IME) and using a fallback to do so,
    // try to extract the composed characters from the fallback object.
    // If composition event is available, we extract a string only at
    // compositionevent, otherwise extract it at fallback events.
    if (isComposing) {
        if (topLevelType === 'topCompositionEnd' || !canUseCompositionEvent && isFallbackCompositionEnd(topLevelType, nativeEvent)) {
            var chars = FallbackCompositionState_1.getData();
            FallbackCompositionState_1.reset();
            isComposing = false;
            return chars;
        }
        return null;
    }

    switch (topLevelType) {
        case 'topPaste':
            // If a paste event occurs after a keypress, throw out the input
            // chars. Paste events should not lead to BeforeInput events.
            return null;
        case 'topKeyPress':
            /**
             * As of v27, Firefox may fire keypress events even when no character
             * will be inserted. A few possibilities:
             *
             * - `which` is `0`. Arrow keys, Esc key, etc.
             *
             * - `which` is the pressed key code, but no char is available.
             *   Ex: 'AltGr + d` in Polish. There is no modified character for
             *   this key combination and no character is inserted into the
             *   document, but FF fires the keypress for char code `100` anyway.
             *   No `input` event will occur.
             *
             * - `which` is the pressed key code, but a command combination is
             *   being used. Ex: `Cmd+C`. No character is inserted, and no
             *   `input` event will occur.
             */
            if (!isKeypressCommand(nativeEvent)) {
                // IE fires the `keypress` event when a user types an emoji via
                // Touch keyboard of Windows.  In such a case, the `char` property
                // holds an emoji character like `\uD83D\uDE0A`.  Because its length
                // is 2, the property `which` does not represent an emoji correctly.
                // In such a case, we directly return the `char` property instead of
                // using `which`.
                if (nativeEvent.char && nativeEvent.char.length > 1) {
                    return nativeEvent.char;
                } else if (nativeEvent.which) {
                    return String.fromCharCode(nativeEvent.which);
                }
            }
            return null;
        case 'topCompositionEnd':
            return useFallbackCompositionData ? null : nativeEvent.data;
        default:
            return null;
    }
}

/**
 * Extract a SyntheticInputEvent for `beforeInput`, based on either native
 * `textInput` or fallback behavior.
 *
 * @return {?object} A SyntheticInputEvent.
 */
function extractBeforeInputEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget) {
    var chars;

    if (canUseTextInputEvent) {
        chars = getNativeBeforeInputChars(topLevelType, nativeEvent);
    } else {
        chars = getFallbackBeforeInputChars(topLevelType, nativeEvent);
    }

    // If no characters are being inserted, no BeforeInput event should
    // be fired.
    if (!chars) {
        return null;
    }

    var event = SyntheticInputEvent_1.getPooled(eventTypes.beforeInput, targetInst, nativeEvent, nativeEventTarget);

    event.data = chars;
    EventPropagators_1.accumulateTwoPhaseDispatches(event);
    return event;
}

/**
 * Create an `onBeforeInput` event to match
 * http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105/#events-inputevents.
 *
 * This event plugin is based on the native `textInput` event
 * available in Chrome, Safari, Opera, and IE. This event fires after
 * `onKeyPress` and `onCompositionEnd`, but before `onInput`.
 *
 * `beforeInput` is spec'd but not implemented in any browsers, and
 * the `input` event does not provide any useful information about what has
 * actually been added, contrary to the spec. Thus, `textInput` is the best
 * available event to identify the characters that have actually been inserted
 * into the target node.
 *
 * This plugin is also responsible for emitting `composition` events, thus
 * allowing us to share composition fallback code for both `beforeInput` and
 * `composition` event types.
 */
var BeforeInputEventPlugin = {
    eventTypes: eventTypes,

    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        return [extractCompositionEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget), extractBeforeInputEvent(topLevelType, targetInst, nativeEvent, nativeEventTarget)];
    }
};

var BeforeInputEventPlugin_1 = BeforeInputEventPlugin;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule isTextInputElement
 * 
 */

/**
 * @see http://www.whatwg.org/specs/web-apps/current-work/multipage/the-input-element.html#input-type-attr-summary
 */

var supportedInputTypes = {
    color: true,
    date: true,
    datetime: true,
    'datetime-local': true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true
};

function isTextInputElement(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();

    if (nodeName === 'input') {
        return !!supportedInputTypes[elem.type];
    }

    if (nodeName === 'textarea') {
        return true;
    }

    return false;
}

var isTextInputElement_1 = isTextInputElement;

var eventTypes$1 = {
    change: {
        phasedRegistrationNames: {
            bubbled: 'onChange',
            captured: 'onChangeCapture'
        },
        dependencies: ['topBlur', 'topChange', 'topClick', 'topFocus', 'topInput', 'topKeyDown', 'topKeyUp', 'topSelectionChange']
    }
};

function createAndAccumulateChangeEvent(inst, nativeEvent, target) {
    var event = SyntheticEvent_1.getPooled(eventTypes$1.change, inst, nativeEvent, target);
    event.type = 'change';
    // Flag this event loop as needing state restore.
    UmdControlledComponent_1.enqueueStateRestore(target);
    EventPropagators_1.accumulateTwoPhaseDispatches(event);
    return event;
}
/**
 * For IE shims
 */
var activeElement = null;
var activeElementInst = null;

/**
 * SECTION: handle `change` event
 */
function shouldUseChangeEvent(elem) {
    var nodeName = elem.nodeName && elem.nodeName.toLowerCase();
    return nodeName === 'select' || nodeName === 'input' && elem.type === 'file';
}

function manualDispatchChangeEvent(nativeEvent) {
    var event = createAndAccumulateChangeEvent(activeElementInst, nativeEvent, getEventTarget_1(nativeEvent));

    // If change and propertychange bubbled, we'd just bind to it like all the
    // other events and have it go through UmdBrowserEventEmitter. Since it
    // doesn't, we manually listen for the events and so we have to enqueue and
    // process the abstract event manually.
    //
    // Batching is necessary here in order to ensure that all event handlers run
    // before the next rerender (including event handlers attached to ancestor
    // elements instead of directly on the input). Without this, controlled
    // components don't work properly in conjunction with event bubbling because
    // the component is rerendered and the value reverted before all the event
    // handlers can run. See https://github.com/facebook/umd/issues/708.
    UmdGenericBatching_1.batchedUpdates(runEventInBatch, event);
}

function runEventInBatch(event) {
    EventPluginHub_1.enqueueEvents(event);
    EventPluginHub_1.processEventQueue(false);
}

function getInstIfValueChanged(targetInst) {
    var targetNode = UmdDOMComponentTree_1.getNodeFromInstance(targetInst);
    if (inputValueTracking_1.updateValueIfChanged(targetNode)) {
        return targetInst;
    }
}

function getTargetInstForChangeEvent(topLevelType, targetInst) {
    if (topLevelType === 'topChange') {
        return targetInst;
    }
}

/**
 * SECTION: handle `input` event
 */
var isInputEventSupported = false;
if (ExecutionEnvironment.canUseDOM) {
    // IE9 claims to support the input event but fails to trigger it when
    // deleting text, so we ignore its input events.
    isInputEventSupported = isEventSupported_1('input') && (!document.documentMode || document.documentMode > 9);
}

/**
 * (For IE <=9) Starts tracking propertychange events on the passed-in element
 * and override the value property so that we can distinguish user events from
 * value changes in JS.
 */
function startWatchingForValueChange(target, targetInst) {
    activeElement = target;
    activeElementInst = targetInst;
    activeElement.attachEvent('onpropertychange', handlePropertyChange);
}

/**
 * (For IE <=9) Removes the event listeners from the currently-tracked element,
 * if any exists.
 */
function stopWatchingForValueChange() {
    if (!activeElement) {
        return;
    }
    activeElement.detachEvent('onpropertychange', handlePropertyChange);
    activeElement = null;
    activeElementInst = null;
}

/**
 * (For IE <=9) Handles a propertychange event, sending a `change` event if
 * the value of the active element has changed.
 */
function handlePropertyChange(nativeEvent) {
    if (nativeEvent.propertyName !== 'value') {
        return;
    }
    if (getInstIfValueChanged(activeElementInst)) {
        manualDispatchChangeEvent(nativeEvent);
    }
}

function handleEventsForInputEventPolyfill(topLevelType, target, targetInst) {
    if (topLevelType === 'topFocus') {
        // In IE9, propertychange fires for most input events but is buggy and
        // doesn't fire when text is deleted, but conveniently, selectionchange
        // appears to fire in all of the remaining cases so we catch those and
        // forward the event if the value has changed
        // In either case, we don't want to call the event handler if the value
        // is changed from JS so we redefine a setter for `.value` that updates
        // our activeElementValue variable, allowing us to ignore those changes
        //
        // stopWatching() should be a noop here but we call it just in case we
        // missed a blur event somehow.
        stopWatchingForValueChange();
        startWatchingForValueChange(target, targetInst);
    } else if (topLevelType === 'topBlur') {
        stopWatchingForValueChange();
    }
}

// For IE8 and IE9.
function getTargetInstForInputEventPolyfill(topLevelType, targetInst) {
    if (topLevelType === 'topSelectionChange' || topLevelType === 'topKeyUp' || topLevelType === 'topKeyDown') {
        // On the selectionchange event, the target is just document which isn't
        // helpful for us so just check activeElement instead.
        //
        // 99% of the time, keydown and keyup aren't necessary. IE8 fails to fire
        // propertychange on the first input event after setting `value` from a
        // script and fires only keydown, keypress, keyup. Catching keyup usually
        // gets it and catching keydown lets us fire an event for the first
        // keystroke if user does a key repeat (it'll be a little delayed: right
        // before the second keystroke). Other input methods (e.g., paste) seem to
        // fire selectionchange normally.
        return getInstIfValueChanged(activeElementInst);
    }
}

/**
 * SECTION: handle `click` event
 */
function shouldUseClickEvent(elem) {
    // Use the `click` event to detect changes to checkbox and radio inputs.
    // This approach works across all browsers, whereas `change` does not fire
    // until `blur` in IE8.
    var nodeName = elem.nodeName;
    return nodeName && nodeName.toLowerCase() === 'input' && (elem.type === 'checkbox' || elem.type === 'radio');
}

function getTargetInstForClickEvent(topLevelType, targetInst) {
    if (topLevelType === 'topClick') {
        return getInstIfValueChanged(targetInst);
    }
}

function getTargetInstForInputOrChangeEvent(topLevelType, targetInst) {
    if (topLevelType === 'topInput' || topLevelType === 'topChange') {
        return getInstIfValueChanged(targetInst);
    }
}

function handleControlledInputBlur(inst, node) {
    // TODO: In IE, inst is occasionally null. Why?
    if (inst == null) {
        return;
    }

    // Fiber and UmdDOM keep wrapper state in separate places
    var state = inst._wrapperState || node._wrapperState;

    if (!state || !state.controlled || node.type !== 'number') {
        return;
    }

    // If controlled, assign the value attribute to the current value on blur
    var value = '' + node.value;
    if (node.getAttribute('value') !== value) {
        node.setAttribute('value', value);
    }
}

/**
 * This plugin creates an `onChange` event that normalizes change events
 * across form elements. This event fires at a time when it's possible to
 * change the element's value without seeing a flicker.
 *
 * Supported elements are:
 * - input (see `isTextInputElement`)
 * - textarea
 * - select
 */
var ChangeEventPlugin = {
    eventTypes: eventTypes$1,

    _isInputEventSupported: isInputEventSupported,

    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        var targetNode = targetInst ? UmdDOMComponentTree_1.getNodeFromInstance(targetInst) : window;

        var getTargetInstFunc, handleEventFunc;
        if (shouldUseChangeEvent(targetNode)) {
            getTargetInstFunc = getTargetInstForChangeEvent;
        } else if (isTextInputElement_1(targetNode)) {
            if (isInputEventSupported) {
                getTargetInstFunc = getTargetInstForInputOrChangeEvent;
            } else {
                getTargetInstFunc = getTargetInstForInputEventPolyfill;
                handleEventFunc = handleEventsForInputEventPolyfill;
            }
        } else if (shouldUseClickEvent(targetNode)) {
            getTargetInstFunc = getTargetInstForClickEvent;
        }

        if (getTargetInstFunc) {
            var inst = getTargetInstFunc(topLevelType, targetInst);
            if (inst) {
                var event = createAndAccumulateChangeEvent(inst, nativeEvent, nativeEventTarget);
                return event;
            }
        }

        if (handleEventFunc) {
            handleEventFunc(topLevelType, targetNode, targetInst);
        }

        // When blurring, set the value attribute for number inputs
        if (topLevelType === 'topBlur') {
            handleControlledInputBlur(targetInst, targetNode);
        }
    }
};

var ChangeEventPlugin_1 = ChangeEventPlugin;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule DOMEventPluginOrder
 */

/**
 * Module that is injectable into `EventPluginHub`, that specifies a
 * deterministic ordering of `EventPlugin`s. A convenient way to reason about
 * plugins, without having to package every one of them. This is better than
 * having plugins be ordered in the same order that they are injected because
 * that ordering would be influenced by the packaging order.
 * `ResponderEventPlugin` must occur before `SimpleEventPlugin` so that
 * preventing default on events is convenient in `SimpleEventPlugin` handlers.
 */

var DOMEventPluginOrder = ['ResponderEventPlugin', 'SimpleEventPlugin', 'TapEventPlugin', 'EnterLeaveEventPlugin', 'ChangeEventPlugin', 'SelectEventPlugin', 'BeforeInputEventPlugin'];

var DOMEventPluginOrder_1 = DOMEventPluginOrder;

/**
 * @interface UIEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var UIEventInterface = {
    view: function (event) {
        if (event.view) {
            return event.view;
        }

        var target = getEventTarget_1(event);
        if (target.window === target) {
            // target is a window object
            return target;
        }

        var doc = target.ownerDocument;
        // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
        if (doc) {
            return doc.defaultView || doc.parentWindow;
        } else {
            return window;
        }
    },
    detail: function (event) {
        return event.detail || 0;
    }
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticEvent}
 */
function SyntheticUIEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticEvent_1.augmentClass(SyntheticUIEvent, UIEventInterface);

var SyntheticUIEvent_1 = SyntheticUIEvent;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule getEventModifierState
 */

/**
 * Translation from modifier key to the associated property in the event.
 * @see http://www.w3.org/TR/DOM-Level-3-Events/#keys-Modifiers
 */

var modifierKeyToProp = {
    Alt: 'altKey',
    Control: 'ctrlKey',
    Meta: 'metaKey',
    Shift: 'shiftKey'
};

// IE8 does not implement getModifierState so we simply map it to the only
// modifier keys exposed by the event itself, does not support Lock-keys.
// Currently, all major browsers except Chrome seems to support Lock-keys.
function modifierStateGetter(keyArg) {
    var syntheticEvent = this;
    var nativeEvent = syntheticEvent.nativeEvent;
    if (nativeEvent.getModifierState) {
        return nativeEvent.getModifierState(keyArg);
    }
    var keyProp = modifierKeyToProp[keyArg];
    return keyProp ? !!nativeEvent[keyProp] : false;
}

function getEventModifierState(nativeEvent) {
    return modifierStateGetter;
}

var getEventModifierState_1 = getEventModifierState;

/**
 * @interface MouseEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var MouseEventInterface = {
    screenX: null,
    screenY: null,
    clientX: null,
    clientY: null,
    pageX: null,
    pageY: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    getModifierState: getEventModifierState_1,
    button: null,
    buttons: null,
    relatedTarget: function (event) {
        return event.relatedTarget || (event.fromElement === event.srcElement ? event.toElement : event.fromElement);
    }
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticMouseEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticUIEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticUIEvent_1.augmentClass(SyntheticMouseEvent, MouseEventInterface);

var SyntheticMouseEvent_1 = SyntheticMouseEvent;

var eventTypes$2 = {
    mouseEnter: {
        registrationName: 'onMouseEnter',
        dependencies: ['topMouseOut', 'topMouseOver']
    },
    mouseLeave: {
        registrationName: 'onMouseLeave',
        dependencies: ['topMouseOut', 'topMouseOver']
    }
};

var EnterLeaveEventPlugin = {
    eventTypes: eventTypes$2,

    /**
     * For almost every interaction we care about, there will be both a top-level
     * `mouseover` and `mouseout` event that occurs. Only use `mouseout` so that
     * we do not extract duplicate events. However, moving the mouse into the
     * browser from outside will not fire a `mouseout` event. In this case, we use
     * the `mouseover` top-level event.
     */
    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        if (topLevelType === 'topMouseOver' && (nativeEvent.relatedTarget || nativeEvent.fromElement)) {
            return null;
        }
        if (topLevelType !== 'topMouseOut' && topLevelType !== 'topMouseOver') {
            // Must not be a mouse in or mouse out - ignoring.
            return null;
        }

        var win;
        if (nativeEventTarget.window === nativeEventTarget) {
            // `nativeEventTarget` is probably a window object.
            win = nativeEventTarget;
        } else {
            // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
            var doc = nativeEventTarget.ownerDocument;
            if (doc) {
                win = doc.defaultView || doc.parentWindow;
            } else {
                win = window;
            }
        }

        var from;
        var to;
        if (topLevelType === 'topMouseOut') {
            from = targetInst;
            var related = nativeEvent.relatedTarget || nativeEvent.toElement;
            to = related ? UmdDOMComponentTree_1.getClosestInstanceFromNode(related) : null;
        } else {
            // Moving to a node from outside the window.
            from = null;
            to = targetInst;
        }

        if (from === to) {
            // Nothing pertains to our managed components.
            return null;
        }

        var fromNode = from == null ? win : UmdDOMComponentTree_1.getNodeFromInstance(from);
        var toNode = to == null ? win : UmdDOMComponentTree_1.getNodeFromInstance(to);

        var leave = SyntheticMouseEvent_1.getPooled(eventTypes$2.mouseLeave, from, nativeEvent, nativeEventTarget);
        leave.type = 'mouseleave';
        leave.target = fromNode;
        leave.relatedTarget = toNode;

        var enter = SyntheticMouseEvent_1.getPooled(eventTypes$2.mouseEnter, to, nativeEvent, nativeEventTarget);
        enter.type = 'mouseenter';
        enter.target = toNode;
        enter.relatedTarget = fromNode;

        EventPropagators_1.accumulateEnterLeaveDispatches(leave, enter, from, to);

        return [leave, enter];
    }
};

var EnterLeaveEventPlugin_1 = EnterLeaveEventPlugin;

var DOCUMENT_NODE$2 = HTMLNodeType_1.DOCUMENT_NODE;





var skipSelectionChangeEvent = ExecutionEnvironment.canUseDOM && 'documentMode' in document && document.documentMode <= 11;

var eventTypes$3 = {
    select: {
        phasedRegistrationNames: {
            bubbled: 'onSelect',
            captured: 'onSelectCapture'
        },
        dependencies: ['topBlur', 'topContextMenu', 'topFocus', 'topKeyDown', 'topKeyUp', 'topMouseDown', 'topMouseUp', 'topSelectionChange']
    }
};

var activeElement$1 = null;
var activeElementInst$1 = null;
var lastSelection = null;
var mouseDown = false;

// Track whether all listeners exists for this plugin. If none exist, we do
// not extract events. See #3639.
var isListeningToAllDependencies = UmdBrowserEventEmitter_1.isListeningToAllDependencies;

/**
 * Get an object which is a unique representation of the current selection.
 *
 * The return value will not be consistent across nodes or browsers, but
 * two identical selections on the same node will return identical objects.
 *
 * @param {DOMElement} node
 * @return {object}
 */
function getSelection(node) {
    if ('selectionStart' in node && UmdInputSelection_1.hasSelectionCapabilities(node)) {
        return {
            start: node.selectionStart,
            end: node.selectionEnd
        };
    } else if (window.getSelection) {
        var selection = window.getSelection();
        return {
            anchorNode: selection.anchorNode,
            anchorOffset: selection.anchorOffset,
            focusNode: selection.focusNode,
            focusOffset: selection.focusOffset
        };
    }
}

/**
 * Poll selection to see whether it's changed.
 *
 * @param {object} nativeEvent
 * @return {?SyntheticEvent}
 */
function constructSelectEvent(nativeEvent, nativeEventTarget) {
    // Ensure we have the right element, and that the user is not dragging a
    // selection (this matches native `select` event behavior). In HTML5, select
    // fires only on input and textarea thus if there's no focused element we
    // won't dispatch.
    if (mouseDown || activeElement$1 == null || activeElement$1 !== getActiveElement()) {
        return null;
    }

    // Only fire when selection has actually changed.
    var currentSelection = getSelection(activeElement$1);
    if (!lastSelection || !shallowEqual(lastSelection, currentSelection)) {
        lastSelection = currentSelection;

        var syntheticEvent = SyntheticEvent_1.getPooled(eventTypes$3.select, activeElementInst$1, nativeEvent, nativeEventTarget);

        syntheticEvent.type = 'select';
        syntheticEvent.target = activeElement$1;

        EventPropagators_1.accumulateTwoPhaseDispatches(syntheticEvent);

        return syntheticEvent;
    }

    return null;
}

/**
 * This plugin creates an `onSelect` event that normalizes select events
 * across form elements.
 *
 * Supported elements are:
 * - input (see `isTextInputElement`)
 * - textarea
 * - contentEditable
 *
 * This differs from native browser implementations in the following ways:
 * - Fires on contentEditable fields as well as inputs.
 * - Fires for collapsed selection.
 * - Fires after user input.
 */
var SelectEventPlugin = {
    eventTypes: eventTypes$3,

    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        var doc = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget.document : nativeEventTarget.nodeType === DOCUMENT_NODE$2 ? nativeEventTarget : nativeEventTarget.ownerDocument;
        if (!doc || !isListeningToAllDependencies('onSelect', doc)) {
            return null;
        }

        var targetNode = targetInst ? UmdDOMComponentTree_1.getNodeFromInstance(targetInst) : window;

        switch (topLevelType) {
            // Track the input node that has focus.
            case 'topFocus':
                if (isTextInputElement_1(targetNode) || targetNode.contentEditable === 'true') {
                    activeElement$1 = targetNode;
                    activeElementInst$1 = targetInst;
                    lastSelection = null;
                }
                break;
            case 'topBlur':
                activeElement$1 = null;
                activeElementInst$1 = null;
                lastSelection = null;
                break;
            // Don't fire the event while the user is dragging. This matches the
            // semantics of the native select event.
            case 'topMouseDown':
                mouseDown = true;
                break;
            case 'topContextMenu':
            case 'topMouseUp':
                mouseDown = false;
                return constructSelectEvent(nativeEvent, nativeEventTarget);
            // Chrome and IE fire non-standard event when selection is changed (and
            // sometimes when it hasn't). IE's event fires out of order with respect
            // to key and input events on deletion, so we discard it.
            //
            // Firefox doesn't support selectionchange, so check selection status
            // after each key entry. The selection changes after keydown and before
            // keyup, but we check on keydown as well in the case of holding down a
            // key, when multiple keydown events are fired but only one keyup is.
            // This is also our approach for IE handling, for the reason above.
            case 'topSelectionChange':
                if (skipSelectionChangeEvent) {
                    break;
                }
            // falls through
            case 'topKeyDown':
            case 'topKeyUp':
                return constructSelectEvent(nativeEvent, nativeEventTarget);
        }

        return null;
    }
};

var SelectEventPlugin_1 = SelectEventPlugin;

/**
 * @interface Event
 * @see http://www.w3.org/TR/css3-animations/#AnimationEvent-interface
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AnimationEvent
 */
var AnimationEventInterface = {
    animationName: null,
    elapsedTime: null,
    pseudoElement: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticEvent}
 */
function SyntheticAnimationEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticEvent_1.augmentClass(SyntheticAnimationEvent, AnimationEventInterface);

var SyntheticAnimationEvent_1 = SyntheticAnimationEvent;

/**
 * @interface Event
 * @see http://www.w3.org/TR/clipboard-apis/
 */
var ClipboardEventInterface = {
    clipboardData: function (event) {
        return 'clipboardData' in event ? event.clipboardData : window.clipboardData;
    }
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticClipboardEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticEvent_1.augmentClass(SyntheticClipboardEvent, ClipboardEventInterface);

var SyntheticClipboardEvent_1 = SyntheticClipboardEvent;

/**
 * @interface FocusEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var FocusEventInterface = {
    relatedTarget: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticFocusEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticUIEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticUIEvent_1.augmentClass(SyntheticFocusEvent, FocusEventInterface);

var SyntheticFocusEvent_1 = SyntheticFocusEvent;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule getEventCharCode
 */

/**
 * `charCode` represents the actual "character code" and is safe to use with
 * `String.fromCharCode`. As such, only keys that correspond to printable
 * characters produce a valid `charCode`, the only exception to this is Enter.
 * The Tab-key is considered non-printable and does not have a `charCode`,
 * presumably because it does not produce a tab-character in browsers.
 *
 * @param {object} nativeEvent Native browser event.
 * @return {number} Normalized `charCode` property.
 */

function getEventCharCode(nativeEvent) {
    var charCode;
    var keyCode = nativeEvent.keyCode;

    if ('charCode' in nativeEvent) {
        charCode = nativeEvent.charCode;

        // FF does not set `charCode` for the Enter-key, check against `keyCode`.
        if (charCode === 0 && keyCode === 13) {
            charCode = 13;
        }
    } else {
        // IE8 does not implement `charCode`, but `keyCode` has the correct value.
        charCode = keyCode;
    }

    // Some non-printable keys are reported in `charCode`/`keyCode`, discard them.
    // Must not discard the (non-)printable Enter-key.
    if (charCode >= 32 || charCode === 13) {
        return charCode;
    }

    return 0;
}

var getEventCharCode_1 = getEventCharCode;

/**
 * Normalization of deprecated HTML5 `key` values
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Key_names
 */
var normalizeKey = {
    Esc: 'Escape',
    Spacebar: ' ',
    Left: 'ArrowLeft',
    Up: 'ArrowUp',
    Right: 'ArrowRight',
    Down: 'ArrowDown',
    Del: 'Delete',
    Win: 'OS',
    Menu: 'ContextMenu',
    Apps: 'ContextMenu',
    Scroll: 'ScrollLock',
    MozPrintableKey: 'Unidentified'
};

/**
 * Translation from legacy `keyCode` to HTML5 `key`
 * Only special keys supported, all others depend on keyboard layout or browser
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#Key_names
 */
var translateToKey = {
    8: 'Backspace',
    9: 'Tab',
    12: 'Clear',
    13: 'Enter',
    16: 'Shift',
    17: 'Control',
    18: 'Alt',
    19: 'Pause',
    20: 'CapsLock',
    27: 'Escape',
    32: ' ',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    45: 'Insert',
    46: 'Delete',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    144: 'NumLock',
    145: 'ScrollLock',
    224: 'Meta'
};

/**
 * @param {object} nativeEvent Native browser event.
 * @return {string} Normalized `key` property.
 */
function getEventKey(nativeEvent) {
    if (nativeEvent.key) {
        // Normalize inconsistent values reported by browsers due to
        // implementations of a working draft specification.

        // FireFox implements `key` but returns `MozPrintableKey` for all
        // printable characters (normalized to `Unidentified`), ignore it.
        var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
        if (key !== 'Unidentified') {
            return key;
        }
    }

    // Browser does not implement `key`, polyfill as much of it as we can.
    if (nativeEvent.type === 'keypress') {
        var charCode = getEventCharCode_1(nativeEvent);

        // The enter-key is technically both printable and non-printable and can
        // thus be captured by `keypress`, no other non-printable key should.
        return charCode === 13 ? 'Enter' : String.fromCharCode(charCode);
    }
    if (nativeEvent.type === 'keydown' || nativeEvent.type === 'keyup') {
        // While user keyboard layout determines the actual meaning of each
        // `keyCode` value, almost all function keys have a universal value.
        return translateToKey[nativeEvent.keyCode] || 'Unidentified';
    }
    return '';
}

var getEventKey_1 = getEventKey;

/**
 * @interface KeyboardEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var KeyboardEventInterface = {
    key: getEventKey_1,
    location: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    repeat: null,
    locale: null,
    getModifierState: getEventModifierState_1,
    // Legacy Interface
    charCode: function (event) {
        // `charCode` is the result of a KeyPress event and represents the value of
        // the actual printable character.

        // KeyPress is deprecated, but its replacement is not yet final and not
        // implemented in any major browser. Only KeyPress has charCode.
        if (event.type === 'keypress') {
            return getEventCharCode_1(event);
        }
        return 0;
    },
    keyCode: function (event) {
        // `keyCode` is the result of a KeyDown/Up event and represents the value of
        // physical keyboard key.

        // The actual meaning of the value depends on the users' keyboard layout
        // which cannot be detected. Assuming that it is a US keyboard layout
        // provides a surprisingly accurate mapping for US and European users.
        // Due to this, it is left to the user to implement at this time.
        if (event.type === 'keydown' || event.type === 'keyup') {
            return event.keyCode;
        }
        return 0;
    },
    which: function (event) {
        // `which` is an alias for either `keyCode` or `charCode` depending on the
        // type of the event.
        if (event.type === 'keypress') {
            return getEventCharCode_1(event);
        }
        if (event.type === 'keydown' || event.type === 'keyup') {
            return event.keyCode;
        }
        return 0;
    }
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticKeyboardEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticUIEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticUIEvent_1.augmentClass(SyntheticKeyboardEvent, KeyboardEventInterface);

var SyntheticKeyboardEvent_1 = SyntheticKeyboardEvent;

/**
 * @interface DragEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var DragEventInterface = {
    dataTransfer: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticDragEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticMouseEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticMouseEvent_1.augmentClass(SyntheticDragEvent, DragEventInterface);

var SyntheticDragEvent_1 = SyntheticDragEvent;

/**
 * @interface TouchEvent
 * @see http://www.w3.org/TR/touch-events/
 */
var TouchEventInterface = {
    touches: null,
    targetTouches: null,
    changedTouches: null,
    altKey: null,
    metaKey: null,
    ctrlKey: null,
    shiftKey: null,
    getModifierState: getEventModifierState_1
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticUIEvent}
 */
function SyntheticTouchEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticUIEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticUIEvent_1.augmentClass(SyntheticTouchEvent, TouchEventInterface);

var SyntheticTouchEvent_1 = SyntheticTouchEvent;

/**
 * @interface Event
 * @see http://www.w3.org/TR/2009/WD-css3-transitions-20090320/#transition-events-
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TransitionEvent
 */
var TransitionEventInterface = {
    propertyName: null,
    elapsedTime: null,
    pseudoElement: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticEvent}
 */
function SyntheticTransitionEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticEvent_1.augmentClass(SyntheticTransitionEvent, TransitionEventInterface);

var SyntheticTransitionEvent_1 = SyntheticTransitionEvent;

/**
 * @interface WheelEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
var WheelEventInterface = {
    deltaX: function (event) {
        return 'deltaX' in event ? event.deltaX : // Fallback to `wheelDeltaX` for Webkit and normalize (right is positive).
            'wheelDeltaX' in event ? -event.wheelDeltaX : 0;
    },
    deltaY: function (event) {
        return 'deltaY' in event ? event.deltaY : // Fallback to `wheelDeltaY` for Webkit and normalize (down is positive).
            'wheelDeltaY' in event ? -event.wheelDeltaY : // Fallback to `wheelDelta` for IE<9 and normalize (down is positive).
                'wheelDelta' in event ? -event.wheelDelta : 0;
    },
    deltaZ: null,

    // Browsers without "deltaMode" is reporting in raw wheel delta where one
    // notch on the scroll is always +/- 120, roughly equivalent to pixels.
    // A good approximation of DOM_DELTA_LINE (1) is 5% of viewport size or
    // ~40 pixels, for DOM_DELTA_SCREEN (2) it is 87.5% of viewport size.
    deltaMode: null
};

/**
 * @param {object} dispatchConfig Configuration used to dispatch this event.
 * @param {string} dispatchMarker Marker identifying the event target.
 * @param {object} nativeEvent Native browser event.
 * @extends {SyntheticMouseEvent}
 */
function SyntheticWheelEvent(dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget) {
    return SyntheticMouseEvent_1.call(this, dispatchConfig, dispatchMarker, nativeEvent, nativeEventTarget);
}

SyntheticMouseEvent_1.augmentClass(SyntheticWheelEvent, WheelEventInterface);

var SyntheticWheelEvent_1 = SyntheticWheelEvent;

/**
 * Turns
 * ['abort', ...]
 * into
 * eventTypes = {
 *   'abort': {
 *     phasedRegistrationNames: {
 *       bubbled: 'onAbort',
 *       captured: 'onAbortCapture',
 *     },
 *     dependencies: ['topAbort'],
 *   },
 *   ...
 * };
 * topLevelEventsToDispatchConfig = {
 *   'topAbort': { sameConfig }
 * };
 */
var eventTypes$4 = {};
var topLevelEventsToDispatchConfig = {};
['abort', 'animationEnd', 'animationIteration', 'animationStart', 'blur', 'cancel', 'canPlay', 'canPlayThrough', 'click', 'close', 'contextMenu', 'copy', 'cut', 'doubleClick', 'drag', 'dragEnd', 'dragEnter', 'dragExit', 'dragLeave', 'dragOver', 'dragStart', 'drop', 'durationChange', 'emptied', 'encrypted', 'ended', 'error', 'focus', 'input', 'invalid', 'keyDown', 'keyPress', 'keyUp', 'load', 'loadedData', 'loadedMetadata', 'loadStart', 'mouseDown', 'mouseMove', 'mouseOut', 'mouseOver', 'mouseUp', 'paste', 'pause', 'play', 'playing', 'progress', 'rateChange', 'reset', 'scroll', 'seeked', 'seeking', 'stalled', 'submit', 'suspend', 'timeUpdate', 'toggle', 'touchCancel', 'touchEnd', 'touchMove', 'touchStart', 'transitionEnd', 'volumeChange', 'waiting', 'wheel'].forEach(function (event) {
    var capitalizedEvent = event[0].toUpperCase() + event.slice(1);
    var onEvent = 'on' + capitalizedEvent;
    var topEvent = 'top' + capitalizedEvent;

    var type = {
        phasedRegistrationNames: {
            bubbled: onEvent,
            captured: onEvent + 'Capture'
        },
        dependencies: [topEvent]
    };
    eventTypes$4[event] = type;
    topLevelEventsToDispatchConfig[topEvent] = type;
});

var SimpleEventPlugin = {
    eventTypes: eventTypes$4,

    extractEvents: function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
        var dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];
        if (!dispatchConfig) {
            return null;
        }
        var EventConstructor;
        switch (topLevelType) {
            case 'topAbort':
            case 'topCancel':
            case 'topCanPlay':
            case 'topCanPlayThrough':
            case 'topClose':
            case 'topDurationChange':
            case 'topEmptied':
            case 'topEncrypted':
            case 'topEnded':
            case 'topError':
            case 'topInput':
            case 'topInvalid':
            case 'topLoad':
            case 'topLoadedData':
            case 'topLoadedMetadata':
            case 'topLoadStart':
            case 'topPause':
            case 'topPlay':
            case 'topPlaying':
            case 'topProgress':
            case 'topRateChange':
            case 'topReset':
            case 'topSeeked':
            case 'topSeeking':
            case 'topStalled':
            case 'topSubmit':
            case 'topSuspend':
            case 'topTimeUpdate':
            case 'topToggle':
            case 'topVolumeChange':
            case 'topWaiting':
                // HTML Events
                // @see http://www.w3.org/TR/html5/index.html#events-0
                EventConstructor = SyntheticEvent_1;
                break;
            case 'topKeyPress':
                // Firefox creates a keypress event for function keys too. This removes
                // the unwanted keypress events. Enter is however both printable and
                // non-printable. One would expect Tab to be as well (but it isn't).
                if (getEventCharCode_1(nativeEvent) === 0) {
                    return null;
                }
            /* falls through */
            case 'topKeyDown':
            case 'topKeyUp':
                EventConstructor = SyntheticKeyboardEvent_1;
                break;
            case 'topBlur':
            case 'topFocus':
                EventConstructor = SyntheticFocusEvent_1;
                break;
            case 'topClick':
                // Firefox creates a click event on right mouse clicks. This removes the
                // unwanted click events.
                if (nativeEvent.button === 2) {
                    return null;
                }
            /* falls through */
            case 'topDoubleClick':
            case 'topMouseDown':
            case 'topMouseMove':
            case 'topMouseUp':
            // TODO: Disabled elements should not respond to mouse events
            /* falls through */
            case 'topMouseOut':
            case 'topMouseOver':
            case 'topContextMenu':
                EventConstructor = SyntheticMouseEvent_1;
                break;
            case 'topDrag':
            case 'topDragEnd':
            case 'topDragEnter':
            case 'topDragExit':
            case 'topDragLeave':
            case 'topDragOver':
            case 'topDragStart':
            case 'topDrop':
                EventConstructor = SyntheticDragEvent_1;
                break;
            case 'topTouchCancel':
            case 'topTouchEnd':
            case 'topTouchMove':
            case 'topTouchStart':
                EventConstructor = SyntheticTouchEvent_1;
                break;
            case 'topAnimationEnd':
            case 'topAnimationIteration':
            case 'topAnimationStart':
                EventConstructor = SyntheticAnimationEvent_1;
                break;
            case 'topTransitionEnd':
                EventConstructor = SyntheticTransitionEvent_1;
                break;
            case 'topScroll':
                EventConstructor = SyntheticUIEvent_1;
                break;
            case 'topWheel':
                EventConstructor = SyntheticWheelEvent_1;
                break;
            case 'topCopy':
            case 'topCut':
            case 'topPaste':
                EventConstructor = SyntheticClipboardEvent_1;
                break;
        }
        var event = EventConstructor.getPooled(dispatchConfig, targetInst, nativeEvent, nativeEventTarget);
        EventPropagators_1.accumulateTwoPhaseDispatches(event);
        return event;
    }
};

var SimpleEventPlugin_1 = SimpleEventPlugin;

$DOMEventListener.setHandleTopLevel(UmdBrowserEventEmitter_1.handleTopLevel);

/**
 * Inject modules for resolving DOM hierarchy and plugin ordering.
 */
EventPluginHub_1.injection.injectEventPluginOrder(DOMEventPluginOrder_1);
EventPluginUtils_1.injection.injectComponentTree(UmdDOMComponentTree_1);

/**
 * Some important event plugins included by default (without having to require
 * them).
 */
EventPluginHub_1.injection.injectEventPluginsByName({
    SimpleEventPlugin: SimpleEventPlugin_1,
    EnterLeaveEventPlugin: EnterLeaveEventPlugin_1,
    ChangeEventPlugin: ChangeEventPlugin_1,
    SelectEventPlugin: SelectEventPlugin_1,
    BeforeInputEventPlugin: BeforeInputEventPlugin_1
});

var MUST_USE_PROPERTY = DOMProperty.injection.MUST_USE_PROPERTY;
var HAS_BOOLEAN_VALUE = DOMProperty.injection.HAS_BOOLEAN_VALUE;
var HAS_NUMERIC_VALUE = DOMProperty.injection.HAS_NUMERIC_VALUE;
var HAS_POSITIVE_NUMERIC_VALUE = DOMProperty.injection.HAS_POSITIVE_NUMERIC_VALUE;
var HAS_OVERLOADED_BOOLEAN_VALUE = DOMProperty.injection.HAS_OVERLOADED_BOOLEAN_VALUE;
var HAS_STRING_BOOLEAN_VALUE = DOMProperty.injection.HAS_STRING_BOOLEAN_VALUE;

var HTMLDOMPropertyConfig = {
    // When adding attributes to this list, be sure to also add them to
    // the `possibleStandardNames` module to ensure casing and incorrect
    // name warnings.
    Properties: {
        allowFullScreen: HAS_BOOLEAN_VALUE,
        // IE only true/false iFrame attribute
        // https://msdn.microsoft.com/en-us/library/ms533072(v=vs.85).aspx
        allowTransparency: HAS_STRING_BOOLEAN_VALUE,
        // specifies target context for links with `preload` type
        async: HAS_BOOLEAN_VALUE,
        // autoFocus is polyfilled/normalized by AutoFocusUtils
        // autoFocus: HAS_BOOLEAN_VALUE,
        autoPlay: HAS_BOOLEAN_VALUE,
        capture: HAS_BOOLEAN_VALUE,
        checked: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
        cols: HAS_POSITIVE_NUMERIC_VALUE,
        contentEditable: HAS_STRING_BOOLEAN_VALUE,
        controls: HAS_BOOLEAN_VALUE,
        'default': HAS_BOOLEAN_VALUE,
        defer: HAS_BOOLEAN_VALUE,
        disabled: HAS_BOOLEAN_VALUE,
        download: HAS_OVERLOADED_BOOLEAN_VALUE,
        draggable: HAS_STRING_BOOLEAN_VALUE,
        formNoValidate: HAS_BOOLEAN_VALUE,
        hidden: HAS_BOOLEAN_VALUE,
        loop: HAS_BOOLEAN_VALUE,
        // Caution; `option.selected` is not updated if `select.multiple` is
        // disabled with `removeAttribute`.
        multiple: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
        muted: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
        noValidate: HAS_BOOLEAN_VALUE,
        open: HAS_BOOLEAN_VALUE,
        playsInline: HAS_BOOLEAN_VALUE,
        readOnly: HAS_BOOLEAN_VALUE,
        required: HAS_BOOLEAN_VALUE,
        reversed: HAS_BOOLEAN_VALUE,
        rows: HAS_POSITIVE_NUMERIC_VALUE,
        rowSpan: HAS_NUMERIC_VALUE,
        scoped: HAS_BOOLEAN_VALUE,
        seamless: HAS_BOOLEAN_VALUE,
        selected: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
        size: HAS_POSITIVE_NUMERIC_VALUE,
        start: HAS_NUMERIC_VALUE,
        // support for projecting regular DOM Elements via V1 named slots ( shadow dom )
        span: HAS_POSITIVE_NUMERIC_VALUE,
        spellCheck: HAS_STRING_BOOLEAN_VALUE,
        // Style must be explicitly set in the attribute list. Umd components
        // expect a style object
        style: 0,
        // itemScope is for for Microdata support.
        // See http://schema.org/docs/gs.html
        itemScope: HAS_BOOLEAN_VALUE,
        // These attributes must stay in the white-list because they have
        // different attribute names (see DOMAttributeNames below)
        acceptCharset: 0,
        className: 0,
        htmlFor: 0,
        httpEquiv: 0,
        // Attributes with mutation methods must be specified in the whitelist
        // Set the string boolean flag to allow the behavior
        value: HAS_STRING_BOOLEAN_VALUE
    },
    DOMAttributeNames: {
        acceptCharset: 'accept-charset',
        className: 'class',
        htmlFor: 'for',
        httpEquiv: 'http-equiv'
    },
    DOMMutationMethods: {
        value: function (node, value) {
            if (value == null) {
                return node.removeAttribute('value');
            }

            // Number inputs get special treatment due to some edge cases in
            // Chrome. Let everything else assign the value attribute as normal.
            // https://github.com/facebook/umd/issues/7253#issuecomment-236074326
            if (node.type !== 'number' || node.hasAttribute('value') === false) {
                node.setAttribute('value', '' + value);
            } else if (node.validity && !node.validity.badInput && node.ownerDocument.activeElement !== node) {
                // Don't assign an attribute if validation reports bad
                // input. Chrome will clear the value. Additionally, don't
                // operate on inputs that have focus, otherwise Chrome might
                // strip off trailing decimal places and cause the user's
                // cursor position to jump to the beginning of the input.
                //
                // In UmdDOMInput, we have an onBlur event that will trigger
                // this function again when focus is lost.
                node.setAttribute('value', '' + value);
            }
        }
    }
};

var HTMLDOMPropertyConfig_1 = HTMLDOMPropertyConfig;

var HAS_STRING_BOOLEAN_VALUE$1 = DOMProperty.injection.HAS_STRING_BOOLEAN_VALUE;


var NS = {
    xlink: 'http://www.w3.org/1999/xlink',
    xml: 'http://www.w3.org/XML/1998/namespace'
};

/**
 * This is a list of all SVG attributes that need special casing,
 * namespacing, or boolean value assignment.
 *
 * When adding attributes to this list, be sure to also add them to
 * the `possibleStandardNames` module to ensure casing and incorrect
 * name warnings.
 *
 * SVG Attributes List:
 * https://www.w3.org/TR/SVG/attindex.html
 * SMIL Spec:
 * https://www.w3.org/TR/smil
 */
var ATTRS = ['accent-height', 'alignment-baseline', 'arabic-form', 'baseline-shift', 'cap-height', 'clip-path', 'clip-rule', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'dominant-baseline', 'enable-background', 'fill-opacity', 'fill-rule', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'glyph-name', 'glyph-orientation-horizontal', 'glyph-orientation-vertical', 'horiz-adv-x', 'horiz-origin-x', 'image-rendering', 'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'overline-position', 'overline-thickness', 'paint-order', 'panose-1', 'pointer-events', 'rendering-intent', 'shape-rendering', 'stop-color', 'stop-opacity', 'strikethrough-position', 'strikethrough-thickness', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration', 'text-rendering', 'underline-position', 'underline-thickness', 'unicode-bidi', 'unicode-range', 'units-per-em', 'v-alphabetic', 'v-hanging', 'v-ideographic', 'v-mathematical', 'vector-effect', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'word-spacing', 'writing-mode', 'x-height', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xmlns:xlink', 'xml:lang', 'xml:space'];

var SVGDOMPropertyConfig = {
    Properties: {
        autoReverse: HAS_STRING_BOOLEAN_VALUE$1,
        externalResourcesRequired: HAS_STRING_BOOLEAN_VALUE$1,
        preserveAlpha: HAS_STRING_BOOLEAN_VALUE$1
    },
    DOMAttributeNames: {
        autoReverse: 'autoReverse',
        externalResourcesRequired: 'externalResourcesRequired',
        preserveAlpha: 'preserveAlpha'
    },
    DOMAttributeNamespaces: {
        xlinkActuate: NS.xlink,
        xlinkArcrole: NS.xlink,
        xlinkHref: NS.xlink,
        xlinkRole: NS.xlink,
        xlinkShow: NS.xlink,
        xlinkTitle: NS.xlink,
        xlinkType: NS.xlink,
        xmlBase: NS.xml,
        xmlLang: NS.xml,
        xmlSpace: NS.xml
    }
};

var CAMELIZE = /[\-\:]([a-z])/g;
var capitalize = function (token) {
    return token[1].toUpperCase();
};

ATTRS.forEach(function (original) {
    var umdName = original.replace(CAMELIZE, capitalize);

    SVGDOMPropertyConfig.Properties[umdName] = 0;
    SVGDOMPropertyConfig.DOMAttributeNames[umdName] = original;
});

var SVGDOMPropertyConfig_1 = SVGDOMPropertyConfig;

DOMProperty.injection.injectDOMPropertyConfig(HTMLDOMPropertyConfig_1);
DOMProperty.injection.injectDOMPropertyConfig(SVGDOMPropertyConfig_1);

var injectInternals = UmdFiberDevToolsHook.injectInternals;

var ELEMENT_NODE = HTMLNodeType_1.ELEMENT_NODE;
var TEXT_NODE = HTMLNodeType_1.TEXT_NODE;
var COMMENT_NODE = HTMLNodeType_1.COMMENT_NODE;
var DOCUMENT_NODE = HTMLNodeType_1.DOCUMENT_NODE;
var DOCUMENT_FRAGMENT_NODE = HTMLNodeType_1.DOCUMENT_FRAGMENT_NODE;

var ROOT_ATTRIBUTE_NAME = DOMProperty.ROOT_ATTRIBUTE_NAME;




var getChildNamespace = DOMNamespaces.getChildNamespace;
var createElement = $DOMFiberComponent_1.createElement;
var createTextNode = $DOMFiberComponent_1.createTextNode;
var setInitialProperties = $DOMFiberComponent_1.setInitialProperties;
var diffProperties = $DOMFiberComponent_1.diffProperties;
var updateProperties = $DOMFiberComponent_1.updateProperties;
var diffHydratedProperties = $DOMFiberComponent_1.diffHydratedProperties;
var diffHydratedText = $DOMFiberComponent_1.diffHydratedText;
var warnForDeletedHydratableElement = $DOMFiberComponent_1.warnForDeletedHydratableElement;
var warnForDeletedHydratableText = $DOMFiberComponent_1.warnForDeletedHydratableText;
var warnForInsertedHydratedElement = $DOMFiberComponent_1.warnForInsertedHydratedElement;
var warnForInsertedHydratedText = $DOMFiberComponent_1.warnForInsertedHydratedText;
var precacheFiberNode = UmdDOMComponentTree_1.precacheFiberNode;
var updateFiberProps = UmdDOMComponentTree_1.updateFiberProps;


{

    var validateDOMNesting = validateDOMNesting_1;
    var updatedAncestorInfo = validateDOMNesting.updatedAncestorInfo;

}



UmdControlledComponent_1.injection.injectFiberControlledHostComponent($DOMFiberComponent_1);
findDOMNode_1._injectFiber(function (fiber) {
    return DOMRenderer.findHostInstance(fiber);
});

var eventsEnabled = null;
var selectionInformation = null;

/**
 * True if the supplied DOM node is a valid node element.
 *
 * @param {?DOMElement} node The candidate DOM node.
 * @return {boolean} True if the DOM is a valid DOM node.
 * @internal
 */
function isValidContainer(node) {
    return !!(node && (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE || node.nodeType === COMMENT_NODE && node.nodeValue === ' umd-mount-point-unstable '));
}

function getUmdRootElementInContainer(container) {
    if (!container) {
        return null;
    }

    if (container.nodeType === DOCUMENT_NODE) {
        return container.documentElement;
    } else {
        return container.firstChild;
    }
}

function shouldHydrateDueToLegacyHeuristic(container) {
    var rootElement = getUmdRootElementInContainer(container);
    return !!(rootElement && rootElement.nodeType === ELEMENT_NODE && rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME));
}

function shouldAutoFocusHostComponent(type, props) {
    switch (type) {
        case 'button':
        case 'input':
        case 'select':
            return !!props.autoFocus;
    }
    return false;
}

var DOMRenderer = UmdFiberReconciler({
    getRootHostContext: function (rootContainerInstance) {
        var type = void 0;
        var namespace = void 0;
        if (rootContainerInstance.nodeType === DOCUMENT_NODE) {
            type = '#document';
            var root = rootContainerInstance.documentElement;
            namespace = root ? root.namespaceURI : getChildNamespace(null, '');
        } else {
            var container = rootContainerInstance.nodeType === COMMENT_NODE ? rootContainerInstance.parentNode : rootContainerInstance;
            var ownNamespace = container.namespaceURI || null;
            type = container.tagName;
            namespace = getChildNamespace(ownNamespace, type);
        }
        {
            var validatedTag = type.toLowerCase();
            var _ancestorInfo = updatedAncestorInfo(null, validatedTag, null);
            return { namespace: namespace, ancestorInfo: _ancestorInfo };
        }
        return namespace;
    },
    getChildHostContext: function (parentHostContext, type) {
        {
            var parentHostContextDev = parentHostContext;
            var _namespace = getChildNamespace(parentHostContextDev.namespace, type);
            var _ancestorInfo2 = updatedAncestorInfo(parentHostContextDev.ancestorInfo, type, null);
            return { namespace: _namespace, ancestorInfo: _ancestorInfo2 };
        }
        var parentNamespace = parentHostContext;
        return getChildNamespace(parentNamespace, type);
    },
    getPublicInstance: function (instance) {
        return instance;
    },
    prepareForCommit: function () {
        eventsEnabled = UmdBrowserEventEmitter_1.isEnabled();
        selectionInformation = UmdInputSelection_1.getSelectionInformation();
        UmdBrowserEventEmitter_1.setEnabled(false);
    },
    resetAfterCommit: function () {
        UmdInputSelection_1.restoreSelection(selectionInformation);
        selectionInformation = null;
        UmdBrowserEventEmitter_1.setEnabled(eventsEnabled);
        eventsEnabled = null;
    },
    createInstance: function (type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
        var parentNamespace = void 0;
        {
            // TODO: take namespace into account when validating.
            var hostContextDev = hostContext;
            validateDOMNesting(type, null, null, hostContextDev.ancestorInfo);
            if (typeof props.children === 'string' || typeof props.children === 'number') {
                var string = '' + props.children;
                var ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type, null);
                validateDOMNesting(null, string, null, ownAncestorInfo);
            }
            parentNamespace = hostContextDev.namespace;
        }
        var domElement = createElement(type, props, rootContainerInstance, parentNamespace);
        precacheFiberNode(internalInstanceHandle, domElement);
        updateFiberProps(domElement, props);
        return domElement;
    },
    appendInitialChild: function (parentInstance, child) {
        parentInstance.appendChild(child);
    },
    finalizeInitialChildren: function (domElement, type, props, rootContainerInstance) {
        setInitialProperties(domElement, type, props, rootContainerInstance);
        return shouldAutoFocusHostComponent(type, props);
    },
    prepareUpdate: function (domElement, type, oldProps, newProps, rootContainerInstance, hostContext) {
        {
            var hostContextDev = hostContext;
            if (typeof newProps.children !== typeof oldProps.children && (typeof newProps.children === 'string' || typeof newProps.children === 'number')) {
                var string = '' + newProps.children;
                var ownAncestorInfo = updatedAncestorInfo(hostContextDev.ancestorInfo, type, null);
                validateDOMNesting(null, string, null, ownAncestorInfo);
            }
        }
        return diffProperties(domElement, type, oldProps, newProps, rootContainerInstance);
    },
    commitMount: function (domElement, type, newProps, internalInstanceHandle) {
        domElement.focus();
    },
    commitUpdate: function (domElement, updatePayload, type, oldProps, newProps, internalInstanceHandle) {
        // Update the props handle so that we know which props are the ones with
        // with current event handlers.
        updateFiberProps(domElement, newProps);
        // Apply the diff to the DOM node.
        updateProperties(domElement, updatePayload, type, oldProps, newProps);
    },
    shouldSetTextContent: function (type, props) {
        return type === 'textarea' || typeof props.children === 'string' || typeof props.children === 'number' || typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null && typeof props.dangerouslySetInnerHTML.__html === 'string';
    },
    resetTextContent: function (domElement) {
        domElement.textContent = '';
    },
    shouldDeprioritizeSubtree: function (type, props) {
        return !!props.hidden;
    },
    createTextInstance: function (text, rootContainerInstance, hostContext, internalInstanceHandle) {
        {
            var hostContextDev = hostContext;
            validateDOMNesting(null, text, null, hostContextDev.ancestorInfo);
        }
        var textNode = createTextNode(text, rootContainerInstance);
        precacheFiberNode(internalInstanceHandle, textNode);
        return textNode;
    },
    commitTextUpdate: function (textInstance, oldText, newText) {
        textInstance.nodeValue = newText;
    },
    appendChild: function (parentInstance, child) {
        parentInstance.appendChild(child);
    },
    appendChildToContainer: function (container, child) {
        if (container.nodeType === COMMENT_NODE) {
            container.parentNode.insertBefore(child, container);
        } else {
            container.appendChild(child);
        }
    },
    insertBefore: function (parentInstance, child, beforeChild) {
        parentInstance.insertBefore(child, beforeChild);
    },
    insertInContainerBefore: function (container, child, beforeChild) {
        if (container.nodeType === COMMENT_NODE) {
            container.parentNode.insertBefore(child, beforeChild);
        } else {
            container.insertBefore(child, beforeChild);
        }
    },
    removeChild: function (parentInstance, child) {
        parentInstance.removeChild(child);
    },
    removeChildFromContainer: function (container, child) {
        if (container.nodeType === COMMENT_NODE) {
            container.parentNode.removeChild(child);
        } else {
            container.removeChild(child);
        }
    },
    canHydrateInstance: function (instance, type, props) {
        return instance.nodeType === ELEMENT_NODE && type === instance.nodeName.toLowerCase();
    },
    canHydrateTextInstance: function (instance, text) {
        if (text === '') {
            // Empty strings are not parsed by HTML so there won't be a correct match here.
            return false;
        }
        return instance.nodeType === TEXT_NODE;
    },
    getNextHydratableSibling: function (instance) {
        var node = instance.nextSibling;
        // Skip non-hydratable nodes.
        while (node && node.nodeType !== ELEMENT_NODE && node.nodeType !== TEXT_NODE) {
            node = node.nextSibling;
        }
        return node;
    },
    getFirstHydratableChild: function (parentInstance) {
        var next = parentInstance.firstChild;
        // Skip non-hydratable nodes.
        while (next && next.nodeType !== ELEMENT_NODE && next.nodeType !== TEXT_NODE) {
            next = next.nextSibling;
        }
        return next;
    },
    hydrateInstance: function (instance, type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
        precacheFiberNode(internalInstanceHandle, instance);
        // TODO: Possibly defer this until the commit phase where all the events
        // get attached.
        updateFiberProps(instance, props);
        var parentNamespace = void 0;
        {
            var hostContextDev = hostContext;
            parentNamespace = hostContextDev.namespace;
        }
        return diffHydratedProperties(instance, type, props, parentNamespace, rootContainerInstance);
    },
    hydrateTextInstance: function (textInstance, text, internalInstanceHandle) {
        precacheFiberNode(internalInstanceHandle, textInstance);
        return diffHydratedText(textInstance, text);
    },
    didNotHydrateInstance: function (parentInstance, instance) {
        if (instance.nodeType === 1) {
            warnForDeletedHydratableElement(parentInstance, instance);
        } else {
            warnForDeletedHydratableText(parentInstance, instance);
        }
    },
    didNotFindHydratableInstance: function (parentInstance, type, props) {
        warnForInsertedHydratedElement(parentInstance, type, props);
    },
    didNotFindHydratableTextInstance: function (parentInstance, text) {
        warnForInsertedHydratedText(parentInstance, text);
    },


    scheduleDeferredCallback: UmdDOMFrameScheduling.rIC,

    useSyncScheduling: !UmdDOMFeatureFlags_1.fiberAsyncScheduling
});

UmdGenericBatching_1.injection.injectFiberBatchedUpdates(DOMRenderer.batchedUpdates);

var warnedAboutHydrateAPI = false;

function renderSubtreeIntoContainer(parentComponent, children, container, forceHydrate, callback) {


    var root = container._umdRootContainer;
    if (!root) {
        var shouldHydrate = forceHydrate || shouldHydrateDueToLegacyHeuristic(container);
        // First clear any existing content.
        if (!shouldHydrate) {
            var warned = false;
            var rootSibling = void 0;
            while (rootSibling = container.lastChild) {
                {
                    if (!warned && rootSibling.nodeType === ELEMENT_NODE && rootSibling.hasAttribute(ROOT_ATTRIBUTE_NAME)) {
                        warned = true;
                    }
                }
                container.removeChild(rootSibling);
            }
        }
        {
            if (shouldHydrate && !forceHydrate && !warnedAboutHydrateAPI) {
                warnedAboutHydrateAPI = true;
            }
        }
        var newRoot = DOMRenderer.createContainer(container);
        root = container._umdRootContainer = newRoot;
        // Initial mount should not be batched.
        DOMRenderer.unbatchedUpdates(function () {
            DOMRenderer.updateContainer(children, newRoot, parentComponent, callback);
        });
    } else {
        DOMRenderer.updateContainer(children, root, parentComponent, callback);
    }
    return DOMRenderer.getPublicRootInstance(root);
}

function createPortal(children, container) {
    var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    // TODO: pass UmdDOM portal implementation as third argument
    return UmdPortal.createPortal(children, container, null, key);
}

var $DOMFiber = {
    createPortal: createPortal,

    hydrate: function (element, container, callback) {
        // TODO: throw or warn if we couldn't hydrate?
        return renderSubtreeIntoContainer(null, element, container, true, callback);
    },
    render: function (element, container, callback) {
        return renderSubtreeIntoContainer(null, element, container, false, callback);
    },
    unstable_renderSubtreeIntoContainer: function (parentComponent, element, containerNode, callback) {
        return renderSubtreeIntoContainer(parentComponent, element, containerNode, false, callback);
    },
    unmountComponentAtNode: function (container) {

        if (container._umdRootContainer) {


            // Unmount should not be batched.
            DOMRenderer.unbatchedUpdates(function () {
                renderSubtreeIntoContainer(null, null, container, false, function () {
                    container._umdRootContainer = null;
                });
            });
            // If you call unmountComponentAtNode twice in quick succession, you'll
            // get `true` twice. That's probably fine?
            return true;
        } else {
            return false;
        }
    },


    findDOMNode: findDOMNode_1,

    // Temporary alias since we already shipped Umd 16 RC with it.
    // TODO: remove in Umd 17.
    unstable_createPortal: createPortal,

    unstable_batchedUpdates: UmdGenericBatching_1.batchedUpdates,

    unstable_deferredUpdates: DOMRenderer.deferredUpdates,

    flushSync: DOMRenderer.flushSync,

    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
        // For TapEventPlugin which is popular in open source
        EventPluginHub: EventPluginHub_1,
        // Used by test-utils
        EventPluginRegistry: EventPluginRegistry_1,
        EventPropagators: EventPropagators_1,
        UmdControlledComponent: UmdControlledComponent_1,
        UmdDOMComponentTree: UmdDOMComponentTree_1,
        UmdDOMEventListener: $DOMEventListener
    }
};


export default $DOMFiber;

