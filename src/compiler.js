import Watcher from './watcher'

export default class Compiler {
  constructor(vm) {
    this.el = vm.$el
    this.vm = vm
    // 开始编译模板
    this.compile(this.el)
  }

  // 编译模板，处理文本节点和元素节点
  compile(el) {
    // el 下的所有子节点
    let childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      if (this.isTextNode(node)) {
        // 处理文本节点
        this.compilerText(node)
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compilerElement(node)
      }

      // 判断 node 节点是否有子节点，如果有子节点，要递归调用 compile
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })

  }
  // 编译元素节点，处理指令
  compilerElement(node) {
    // console.log(node.attributes)
    // 遍历所有属性节点
    Array.from(node.attributes).forEach(attr => {
      // 判断是否是指令
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        // v-text --> text
        attrName = attrName.substr(2)
        const key = attr.value

        this.update(node, key, attrName)
      }
    })
  }

  update(node, key, attrName) {
    const updateFn = this[`${attrName}Updater`].bind(this)
    updateFn && updateFn(node, this.vm[key], key)
  }

  textUpdater(node, value, key) {
    node.textContent = value
    // 注意：此时的 this 是有问题的，因为 updateFn 是直接调用的，我们需要绑定一下
    new Watcher(this.vm, key, newValue => {
      node.textContent = newValue
    })
  }

  modelUpdater(node, value, key) {
    node.value = value
    
    new Watcher(this.vm, key, newValue => {
      node.value = newValue
    })

    // 实现双向绑定
    node.addEventListener('input', () => {
      this.vm[key] = node.value
    })
  }

  // 编译文本节点，处理插值表达式
  compilerText(node) {
    // console.dir(node)
    // {{ msg }}
    let reg = /\{\{(.+?)\}\}/
    let value = node.textContent
    if (reg.test(value)) {
      let key = RegExp.$1.trim() // msg
      node.textContent = value.replace(reg, this.vm[key])

      // 创建 watcher 对象，在数据改变时更新视图
      new Watcher(this.vm, key, newValue => {
        node.textContent = newValue
      })
    }
  }
  // 判断元素中的属性是否是指令
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  // 判断节点是否是文本节点
  isTextNode(node) {
    return node.nodeType === 3
  }
  // 判断节点是否是元素节点
  isElementNode(node) {
    return node.nodeType === 1 
  }
} 