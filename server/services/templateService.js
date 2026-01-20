
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../uploads/templates');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Saves a template to disk and DB
 * @param {PrismaClient} prisma 
 * @param {Object} data { title, category, type, contentBase64 }
 */
const uploadTemplate = async (prisma, data) => {
    const { title, category, type, contentBase64 } = data;

    // Decode Base64
    const buffer = Buffer.from(contentBase64, 'base64');
    const sizeInBytes = buffer.length;
    const sizeStr = (sizeInBytes / 1024).toFixed(2) + ' KB';

    // File name
    const filename = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_')}.${type}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save to Disk
    fs.writeFileSync(filePath, buffer);

    // Save to DB
    const template = await prisma.documentTemplate.create({
        data: {
            title,
            category,
            type,
            size: sizeStr,
            content: filename // Store relative path/filename
        }
    });

    return template;
};

const getTemplates = async (prisma) => {
    return await prisma.documentTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

const deleteTemplate = async (prisma, id) => {
    const template = await prisma.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new Error("Template not found");

    // Remove file
    const filePath = path.join(UPLOAD_DIR, template.content);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // Remove DB record
    return await prisma.documentTemplate.delete({ where: { id } });
};

module.exports = {
    uploadTemplate,
    getTemplates,
    deleteTemplate
};
