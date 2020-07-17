<!-- 资源上传组件（走OSS） -->
<template>
    <div id="app">
        <upload-oss-cropper
            :ossLimit="10"
            :ossFileSize="10"
            ossFormater="jpg,gif,png,jpeg,bmp"
            ossListType="picture"
            ossBtnTile="<span class='el-icon-plus'></span><p>上传</p>"
            ossValue="marketFileResources"
            ossAccept="image/jpg,image/gif,image/png,image/jpeg,image/bmp"
            :ossTarget="`app/file`"
            :ossConfig="ossConfig"
            :baseFileUrl="serFileUrl"
            isCropper
            :cropperWidth="500"
            :imgRatio="16/9"
            @handleChangeFile="handleChangeFile"
        ></upload-oss-cropper>
        <img v-for="(item, index) in fileList" :key="index"  :src="serFileUrl + item.fileShowUrl" :title="item.fileName" alt=""/>
    </div>
</template>
<script>
import uploadOssCropper from './fgPlugin/fgUpload'
export default {
    name: 'app',
    components: {
        uploadOssCropper
    },
    data () {
        return {
            serFileUrl: '',
            ossConfig: {
                endpoint: '',
                accessKeyId: '',
                accessKeySecret: '',
                bucket: ''
            },
            fileList: []
        }
    },
    methods: {
        handleChangeFile (json) {
            this.fileList = json.data
        }
    }
}
</script>
