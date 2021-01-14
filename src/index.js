import Vue from './vue'

const vm = new Vue({
  el: '#app',
  data: {
    msg: 'Hello My Vue',
    count: 12,
  }
})

console.log(vm.msg)
// vm.msg = { a: 'test' }
// vm.msg = '123'