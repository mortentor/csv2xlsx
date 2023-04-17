/*
 * Copyright © 2023 Netas Ltd., Switzerland.
 * All rights reserved.
 * @author  Lukas Buchs, lukas.buchs@netas.ch
 * @date    2023-04-12
 */

export class XmlBuilder {
        #xml;
        #rootNode;
        #xmlVersion;
        #xmlStandalone;

    constructor(rootName=null, rootNamespace=null, xmlVersion='1.0', xmlStandalone=true) {
        this.#xml = document.implementation.createDocument('', '', null);
        if (rootName) {
            this.#rootNode = this.createAppend(this.#xml, rootName, rootNamespace);
        }

        this.#xmlVersion = xmlVersion;
        this.#xmlStandalone = !!xmlStandalone;
    }

    /**
     * Sets the xml from a string
     * @param {String} xml
     * @returns {undefined}
     */
    setXml(xml) {
        const p = new DOMParser();
        this.#xml = p.parseFromString(xml, 'text/xml');
        this.#rootNode = this.#xml.firstElementChild;
    }

    /**
     * returns the xml as a string
     * @returns {String}
     */
    getXml() {
        const s = new XMLSerializer();
        const str = s.serializeToString(this.#xml);
        return '<?xml version="' + encodeURI(this.#xmlVersion)
                + '" encoding="UTF-8" standalone="' + encodeURI(this.#xmlStandalone ? 'yes': 'no') + '"?>' + "\n" + str;
    }

    /**
     * create and append a element
     * @param {Object|String|null} appendTo
     * @param {String} nodeName
     * @param {String|null} nodeNamespace
     * @param {Object|null} attributes
     * @param {String|null} textContent
     * @returns {Element}
     */
    createAppend(appendTo, nodeName, nodeNamespace, attributes=null, textContent=null) {
        let nde;

        if (appendTo === 'root') {
            appendTo = this.#rootNode;
        }

        // default: same namespace as parent
        if (!nodeNamespace && appendTo && appendTo.namespaceURI) {
            nodeNamespace = appendTo.namespaceURI;
        }


        if (!nodeNamespace) {
            nde = this.#xml.createElement(nodeName);
        } else {
            nde = this.#xml.createElementNS(nodeNamespace, nodeName);
        }

        if (appendTo) {
            appendTo.appendChild(nde);
        }

        if (textContent !== null) {
            const txt = this.#xml.createTextNode(textContent);
            nde.appendChild(txt);
        }

        if (attributes !== null) {
            for (const attributeName in attributes) {
                this.setAttribute(nde, attributeName, attributes[attributeName]);
            }
        }

        return nde;
    }

    /**
     * set a attribute for a node
     * @param {Element|String} node or String 'root'
     * @param {String} attributeName
     * @param {String} attributeValue
     * @param {String|null} attributeNamespace
     * @returns {Attr}
     */
    setAttribute(node, attributeName, attributeValue, attributeNamespace=null) {
        let attr;

        if (!attributeNamespace) {
            attr = this.#xml.createAttribute(attributeName);
        } else {
            attr = this.#xml.createAttributeNS(attributeNamespace, attributeName);
        }

        if (node === 'root') {
            node = this.#rootNode;
        }

        attr.value = attributeValue;
        node.setAttributeNode(attr);

        return attr;
    }

}