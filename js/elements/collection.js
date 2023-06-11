import * as THREE from 'three';

import { Selectable } from './selectable.js';
import { BlockDisplay } from './blockDisplay.js';

class Collection extends Selectable {
    constructor(editor) {
        super(editor);
        this.isCollection = true;
        this.nbt = '';
    }

    addElements(objects) {
        for (let object of objects) {
            if (object.parent) object.parent.remove(object);
            this.add(object);
            object.selected = false;
        }
        this.updateMatrix();

        return this;
    }

    fromElements(objects, keepTransforms = false) {
        for (let object of objects) {
            if (object.parent) object.parent.remove(object);
            this.attach(object);
            object.selected = false;
        }

        if (!keepTransforms) {
            let box = new THREE.Box3().setFromObject(this);
            for (let object of objects) {
                object.position.set(...object.position.add(box.min.clone().negate()).toArray());
            }
            this.position.add(box.min);
        }



        this.updateMatrix();

        return this;
    }

    toElements() {
        this.updateMatrix();
        let objectList = [];
        for (let object of [...this.children]) {
            if (object.isBlockDisplay || object.isCollection) {
                object.updateMatrix();
                this.remove(object);
                object.applyMatrix4(this.matrix);
                this.parent.add(object);
                objectList.push(object);
            }
        }
        this.parent.remove(this);

        return objectList;
    }

    toDict(keepUUID=false) {
        let list = [];
        for (let child of this.children) {
            if (child.isBlockDisplay || child.isCollection) {
                list.push(child.toDict(keepUUID));
            }
        }
        let dict = {
            name: this.name,
            nbt: this.nbt,
            transforms: this.matrix.clone().transpose().toArray(),
            children: list,
        };
        if (keepUUID) dict.uuid = this.uuid;
        return dict;
    }

    static async fromDict(editor, dict, keepUUID=false) {
        let { name, transforms, nbt, children, uuid } = dict;
        let objectList = [];
        for (let child of children) {
            
            if (child.children) {
                objectList.push(await Collection.fromDict(editor, child, keepUUID));
            } else {
                objectList.push(await BlockDisplay.fromDict(editor, child, keepUUID));
            }
        }

        const newGroup = new Collection(editor).addElements(objectList);
        newGroup.name = name;
        newGroup.nbt = nbt;
        if (keepUUID) newGroup.uuid = uuid;
        let matrix = new THREE.Matrix4();
        matrix.set(...transforms);
        newGroup.applyMatrix4(matrix);
        return newGroup;
    }

}

export { Collection };