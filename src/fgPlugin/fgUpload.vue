<!-- 资源上传组件（走OSS） -->
<template>
    <div class="upload">
        <el-upload :class="classInfo"
                   ref="myUpload"
                   action="/"
                   :http-request="httpRequest"
                   :multiple="ossMultiple && !isCropper"
                   :limit="limit"
                   :on-exceed="handleExceed"
                   :on-remove="handleRemove"
                   :on-success="handleSucess"
                   :on-error="handleError"
                   :on-change="handleChange"
                   :before-upload="handleBeforeUpload"
                   :before-remove="beforeRemove"
                   :list-type="ossListType"
                   :accept="ossAccept"
                   :drag="ossDrag"
                   :key="ossValue"
                   :disabled="disabled"
                   :file-list="fileList">
            <el-button class="oss-upload-button"
                       size="mini"
                       type="primary"
                       v-html="ossBtnTile"
                       v-if="ossListType === 'picture-card' ? false : !ossDrag"></el-button>
            <a slot="tip"
               v-if="ossOtherBtn && ossOtherBtn.length>0"
               v-for="(ali,aind) in ossOtherBtn"
               :key="aind"
               :href="ali.url"
               class="upload-btn-side"
               :download="ali.name">{{ali.name}}</a>
            <i class="el-icon-upload"
               v-if="ossDrag"></i>
            <div class="el-upload__text"
                 v-if="ossDrag">将文件拖到此处，或<em>{{ossBtnTile}}</em></div>
            <div slot="tip"
                 class="el-upload__tip"
                 v-html="ossInfo"
                 v-if="ossListType !== 'picture'"></div>
        </el-upload>
        <p v-html="ossInfo"
           v-if="ossListType === 'picture'"
           class="oss-tip-info"></p>
        <el-dialog
            v-if="isCropper && (ossListType === 'picture' || ossListType === 'picture-card')"
            :width="`${cropperWidth >= 400 ? cropperWidth > 800 ? 800 : cropperWidth : 400}px`"
            :append-to-body="true"
            center
            title=""
            :visible.sync="isShowCropper"
            custom-class="cropper-dialog"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false">
            <vue-cropper
                v-if="isShowCropper"
                :ratio="imgRatio"
                :maxWidth="cropperWidth"
                :originImgFile="originImgFile"
                :maxWidthCanvas="maxWidthCanvas"
                :maxHeightCanvas="maxHeightCanvas"
                @closeCallback="closeCallback"
                @getNewImgCallback="getNewImgCallback"
            ></vue-cropper>
        </el-dialog>
    </div>
</template>
<script>
import vmMd5 from 'md5'
import Oss from 'ali-oss'
import vueCropper from './fgCropper'
import {Dialog, Upload, Button} from 'element-ui'

export default {
    name: 'uploadOssCropper',
    components: {
        vueCropper
    },
    props: {
        'ossKey': {
            default: 1,
            type: Number
        },
        // 初始 文件列表
        'originalFileList': {
            default: () => [],
            type: Array
        },
        // 文件上传个数 限制
        'ossLimit': {
            default: 1,
            type: Number
        },
        // 多选 或 单选
        'ossMultiple': {
            default: false,
            type: Boolean
        },
        // 接收文件类型
        'ossAccept': {
            default: '',
            type: String
        },
        // 接收文件格式
        'ossFormater': {
            default: '', // eq: 'jpg,png,git'
            type: String
        },
        // 接收单个文件大小
        'ossFileSize': {
            default: 0, // 0 不限制   单位M
            type: Number
        },
        // 提示信息
        'ossInfo': {
            default: '',
            type: String
        },
        // 上传按钮 名称
        'ossBtnTile': {
            default: '上传文件',
            type: String
        },
        // 文件列表 展示风格 text/picture/picture-card
        'ossListType': {
            default: 'text',
            type: String
        },
        // class 样式名
        'ossClass': {
            default: '',
            type: String
        },
        // 是否开启拖拽模式
        'ossDrag': {
            default: false,
            type: Boolean
        },
        // 上传按钮旁 其他按钮
        'ossOtherBtn': {
            default: () => [],
            type: Array
        },
        // 表单字段名
        'ossValue': {
            default: '',
            type: String
        },
        // baseBucket 设置云储存 路径
        'ossTarget': {
            default: '',
            type: String
        },
        // 网盘剩余容量
        'surplus': '',
        // 父组件对应imgJson的属性名
        'propName': '',
        // 是否禁用
        'disabled': {
            type: Boolean,
            default: false
        },
        // 是否开启裁剪
        'isCropper': {
            type: Boolean,
            default: false
        },
        // w/h长宽比   不传或0为自由比例
        'imgRatio': {
            default: 0,
            type: Number
        },
        'addLinkModelKey': {
            type: Function
        },
        // 裁剪画布宽度   400 <= w <= 800
        'cropperWidth': {
            default: 800,
            type: Number
        },
        'maxWidthCanvas': {
            // Infinity  (无穷大)
            default: 2000,
            type: Number
        },
        'maxHeightCanvas': {
            // Infinity  (无穷大)
            default: 2000,
            type: Number
        },
        ossConfig: {
            type: Object
        },
        baseFileUrl: ''
    },
    data () {
        return {
            timers: null,
            client: null,
            config: this.ossConfig,
            serFileUrl: this.baseFileUrl,
            target: '',
            baseBucket: 'ciipResoruce' + (this.ossTarget ? '/' + this.ossTarget : ''),
            fileList: [],
            newFileList: [],
            limit: 100,
            classInfo: {
                'ct-oss-upload': true,
                'ct-oss-upload-sigle': false,
                [this.ossClass]: !!this.ossClass
            },
            isShowCropper: false,
            originImgFile: {}
        }
    },
    methods: {
        closeCallback (flag) {
            this.isShowCropper = false
            if (!flag) {
                this.$refs.myUpload.uploadFiles = []
            }
        },
        getNewImgCallback (files) {
            this.closeCallback(true)
            this.ossUpload(files)
            let oArr = this.$refs.myUpload.uploadFiles
            oArr.forEach((item, index) => {
                if (item.uid === files.file.uid) oArr[index].url = window.URL.createObjectURL(files.file)
            })
        },
        handleChange (file, fileList) {
            //
        },
        handleBeforeUpload (file) {
            if (file.size > this.surplus) {
                this.$emit('undercapacity', true)
                return false
            } else {
                return this.vaditeFileSize(file) && this.vaditeFileFormater(file)
            }
        },
        httpRequest (param) {
            if (this.isCropper) {
                this.originImgFile = param
                this.isShowCropper = true
            } else this.ossUpload(param)
        },
        handleError (err, file, fileList) {
            console.log('oss error callback', err)
            this.$message.error('文件上传失败')
        },
        handleSucess (response, file, fileList) {
            if (fileList.length > 1 && this.ossLimit === 1) {
                this.ossDelete(fileList[0], fileList, true)
                fileList.splice(0, 1)
            }
            this.parseAllNewsFileJson(fileList)
        },
        handleRemove (file, fileList) {
            if (file.status === 'success') {
                this.parseAllNewsFileJson(fileList)
            }
        },
        handlePreview (file) {

        },
        handleExceed (files, fileList) {
            this.$message.warning(`当前限制选择 ${this.ossLimit} 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`)
        },
        beforeRemove (file, fileList) {
            if (file.status === 'success') {
                this.$confirm(`确定移除 ${file.name}？`, '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then((str) => {
                    this.ossDelete(file, fileList)
                }).catch(() => {
                    this.$message({
                        type: 'info',
                        message: '已取消删除'
                    })
                })
                return false
            }
        },
        ossInitFn () {
            this.client = new Oss(this.config)
        },
        ossUpload (param) {
            if (!this.client) {
                param.onError('oss 未初始化完')
                return
            }
            let file = param.file
            let strName = file.name + file.lastModifiedDate + file.size + file.type
            let fileUuid = vmMd5(strName + (new Date()).getTime())
            // TODO
            this.parseZipModel(file, fileUuid)
            //
            let ossPath =
                this.baseBucket +
                '/' +
                (this.target ? this.target + '/' : '') +
                this.dataFormat(new Date()) +
                '/' +
                fileUuid +
                this.getFormat(file.name)
            this.client.multipartUpload(ossPath, file, {
                progress: (p) => {
                    param.onProgress({percent: Math.floor(p * 100)})
                }
            }).then((result) => {
                if (result.res.status === 200) {
                    param.onSuccess(result)
                } else {
                    param.onError(result)
                }
            }).catch((err) => {
                param.onError(err)
            })
        },
        getFormat (name, md) {
            let pos = name.lastIndexOf('.')
            let fom = ''
            if (md) pos++
            if (pos !== -1) {
                fom = name.substring(pos)
            }
            return fom
        },
        dataFormat (date) {
            let o = {
                y: date.getFullYear(),
                m: date.getMonth() + 1,
                d: date.getDate()
            }
            return o.y.toString() + (o.m >= 10 ? o.m : '0' + o.m).toString() + (o.d >= 10 ? o.d : '0' + o.d).toString()
        },
        ossDelete (file, fileList, types) {
            if (
                this.client &&
                file.response &&
                file.response.name
            ) {
                this.ossDeleteFn(
                    file.uid,
                    fileList,
                    () => this.client.delete(file.response.name),
                    types
                )
            } else if (file.fileUrl) {
                this.ossDeleteFn(
                    file.uid,
                    fileList,
                    () => {
                        let promist = new Promise((resolve, reject) => {
                            resolve('is ok')
                        })
                        return promist
                    },
                    types
                )
            } else {
                this.$message({
                    type: 'error',
                    message: '资源删除失败'
                })
            }
        },
        ossDeleteFn (uid, fileList, deleteFn, types) {
            deleteFn()
                .then(result => {
                    if (!types) {
                        fileList.forEach((fli, findex) => {
                            if (uid === fli.uid) {
                                fileList.splice(findex, 1)
                                this.$emit('deleteFileCallback', fli)
                            }
                        })
                        this.$message({
                            type: 'success',
                            message: '资源删除成功'
                        })
                    }
                    this.parseAllNewsFileJson(fileList)
                })
                .catch(() => {
                    if (!types) {
                        this.$message({
                            type: 'error',
                            message: '资源删除失败'
                        })
                    }
                })
        },
        parseFileJson (file) {
            return {
                fileName: file.raw.name,
                fileSize: file.raw.size,
                fileFormat: this.getFormat(file.raw.name, true),
                fileUrl: file.response.name,
                fileShowUrl: file.response.name
            }
        },
        parseAllNewsFileJson (fileList) {
            this.newFileList = []
            if (fileList && fileList.length > 0) {
                fileList.forEach((item, index) => {
                    if (item.response && item.response.name) {
                        this.newFileList.push(this.parseFileJson(item))
                    }
                })
            }
            let datas = this.newFileList
            let dataLen = datas.length
            if (this.ossLimit === 1) {
                if (dataLen > 0) {
                    datas = datas[0]
                } else {
                    datas = ''
                }
            }
            this.$emit('handleChangeFile', {
                data: datas,
                filevalue: this.ossValue,
                num: fileList.length,
                propName: this.propName ? this.propName : ''
            })
        },
        getOrigFileItem () {
            let orig = this.originalFileList
            if (orig.length > 0) {
                orig.forEach((item, index) => {
                    var isItem = {...item}
                    isItem.name = isItem.fileName
                    isItem.fileUrl = isItem.fileUrl ? isItem.fileUrl : isItem.fileShowUrl
                    isItem.url = this.serFileUrl + isItem.fileUrl
                    this.fileList.push(isItem)
                })
            }
        },
        vaditeFileFormater (file) {
            let name = file.name
            let fomt = this.getFormat(name)
            let arr = this.ossFormater
            let flag = true
            if (arr && fomt) {
                arr = arr.split(',')
                flag = false
                for (var ai = 0; ai < arr.length; ai++) {
                    if (('.' + arr[ai]).toUpperCase() === fomt.toUpperCase()) {
                        flag = true
                        break
                    }
                }
                if (!flag) {
                    this.$message.warning(`当前文件上传不支持${fomt}格式`)
                }
            }
            return flag
        },
        vaditeFileSize (file) {
            let size = file.size / 1024 / 1024
            let vsize = this.ossFileSize
            let flag = true
            if (vsize > 0 && size > vsize) {
                flag = false
                this.$message.warning(`当前限制文件大小为${vsize}MB，当前文件 ${file.name} 大小为 ${this.parseFileSize(file.size)}`)
            }
            return flag
        },
        parseFileSize (num) {
            let n = Number(num)
            let kb = 1024
            let mb = 1024 * 1024
            let gb = 1024 * 1024 * 1024
            let tb = 1024 * 1024 * 1024 * 1024
            let str = ''
            /* eslint-disable no-unused-expressions, no-sequences */
            switch (true) {
                case n < kb :
                    str = 'B'
                    break
                case n < mb && n >= kb :
                    str = 'KB', n = n / kb
                    break
                case n < gb && n >= mb :
                    str = 'MB', n = n / mb
                    break
                case n < tb && n >= gb :
                    str = 'GB', n = n / gb
                    break
                case n >= tb :
                    str = 'TB', n = n / tb
                    break
            }
            /* eslint-disable no-unused-expressions, no-sequences */
            return Math.round(n) + str
        },
        async parseZipModel (blob, ossPath) {
            let vft = ['ZIP'] // 需要识别的格式 [大写]
            let cfile = null
            let cft = (this.getFormat(blob.name, true)).toUpperCase()
            if (vft.indexOf(cft) === 0) cfile = 'MAINBIM.rvt'
            if (cfile) await this.addLinkModelKey(ossPath, cfile)
            return cfile
        }
    },
    mounted () {
        this.limit = this.ossLimit === 1 ? 100 : this.ossLimit
        this.classInfo['ct-oss-upload-sigle'] = this.ossLimit === 1
        this.ossInitFn()
        this.getOrigFileItem()
    },
    watch: {
        originalFileList () {
            if (this.originalFileList) this.getOrigFileItem()
        },
        ossLimit (val) {
            this.limit = val === 1 ? 100 : val
            this.classInfo['ct-oss-upload-sigle'] = val === 1
        }
    }
}
</script>
<style lang="scss">
    $ct_word_orang: #ff9900;
    $ct_height: 40px;
    $ct_border_radius: 4px;
    $ct_bule: #ccc;
    $ct_bule_hover: #11a9e8;
    $ct_word_black: #333;
    $ct_border_gray: #eee;
    $white: #fff;
    $min-font-size: 12px;
    $mid-font-size: 16px;
    @mixin imgCenter{
        max-width: 100%;
        max-height: 100%;
        transform: translate(-50%,-50%);
        position: absolute;
        top: 50%;
        left: 50%;
    }
    .oss-tip-info {
        line-height: $min-font-size;
        font-size: $min-font-size;
        color: #e53333;
    }

    .ct-oss-upload {
        display: inline-block;
        width: 100%;

        .el-upload__tip {
            color: #a9b0b4;
            font-size: $min-font-size;
            line-height: 18px;
        }
        .el-upload {
            .el-button {
                &.el-button--primary {
                    background-color: $ct_bule;
                    border-color: $ct_bule;
                    &:hover {
                        background-color: $ct_bule_hover;
                        border-color: $ct_bule_hover;
                    }
                }
            }
            &.el-upload--picture {
                float: left;
                .el-button {
                    width: 90px;
                    height: 90px;
                    background-color: transparent;
                    border: 1px dashed #ccc;
                    color: #ccc;
                    line-height: 20px;
                    span {
                        font-size: 20px;
                    }
                    p {
                        padding: 0;
                        margin: 0;
                        font-size: $mid-font-size;
                    }
                    &:hover {
                        background-color: transparent;
                        border: 1px dashed $ct_bule;
                        color: $ct_bule;
                    }
                }
            }
        }
        .upload-btn-side {
            color: $ct_bule;
            margin-left: 10px;
            position: relative;
            top: 10px;
            text-decoration: underline;

            &:hover {
                color: $ct_bule_hover;
            }
        }

        .el-upload-list {
            width: 100%;
            margin-top: 10px;

            .el-upload-list__item {
                float: left;
                margin-right: 20px;

                .el-upload-list__item-name {
                    margin-right: 30px;
                    white-space: initial;

                    .el-icon-document {
                        display: inline-block;
                    }
                }
            }
            &.el-upload-list--picture {
                margin-top: 0;

                .el-upload-list__item:first-child {
                    margin-left: 20px;
                    margin-top: 0;
                }

                .el-upload-list__item {
                    border-radius: $ct_border_radius;
                    border-color: $ct_border_gray;
                    width: 90px;
                    height: 90px;
                    padding: 0;
                    margin-top: 0;
                    margin-bottom: 10px;

                    .el-upload-list__item-name,
                    .el-upload-list__item-status-label {
                        display: none;
                    }

                    .el-upload-list__item-thumbnail {
                        margin: 0;
                        width: auto;
                        height: auto;
                        @include imgCenter;
                    }

                    .el-icon-close {
                        width: 100%;
                        height: 100%;
                        top: 0;
                        left: 0;
                        visibility: hidden;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                        background-color: rgba(0, 0, 0, 0.37);
                        color: $white;
                        font-size: $mid-font-size;
                        font-weight: bold;
                        text-align: center;
                        z-index: 2;
                    }

                    &:hover {
                        .el-icon-close {
                            visibility: visible;
                            color: #ccc;
                        }
                    }
                }
            }
        }
        .el-progress {
            position: absolute;
            top: auto;
            bottom: 0;
            line-height: 6px;
            .el-progress-bar {
                .el-progress-bar__outer {
                    height: 6px !important;
                }
            }
            .el-progress__text {
                display: none;
            }
        }
        .el-upload-list--picture .el-upload-list__item:hover .el-progress__text {
            display: none;
        }
        &.ct-oss-upload-sigle {
            .el-upload-list {
                .el-upload-list__item {
                    display: none !important;
                }
                .el-upload-list__item:first-child {
                    display: block !important;
                }
            }
        }
    }
    .el-dialog{
        &.cropper-dialog{
            .el-dialog__header{
                display: none;
            }
            .el-dialog__body{
                padding: 0;
            }
        }
    }
</style>
