import fs from 'fs'

const unlinkFiles = (localFilePath) => {
    if(localFilePath?.trim() === '') {
        return false
    } else {
        fs.unlinkSync(localFilePath)
        return true
    }
}

export { unlinkFiles }
