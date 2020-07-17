// import fgUpload from './fgUpload'
// fgUpload.install = Vue => Vue.component('uploadOssCropper', fgUpload)
// export default fgUpload


import fgUpload from './fgUpload.vue'

export function install(Vue) {
    if (install.installed) return
    install.installed = true
    Vue.component('uploadOssCropper', fgUpload)
}

const plugin = {install}

let GlobalVue = null
if (typeof window !== 'undefined') GlobalVue = window.Vue
else if (typeof global !== 'undefined') GlobalVue = global.Vue
if (GlobalVue) GlobalVue.use(plugin)

export default fgUpload
