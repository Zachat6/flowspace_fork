const crypto = require("crypto")

const Router = require("@koa/router")
const multer = require("@koa/multer")

const prisma = require("../utils/prisma")
const minio = require("../utils/minio")

const router = new Router()
const upload = multer({ storage: multer.memoryStorage() })

const PUBLIC_WRITABLE_FIELDS = ["name", "pronouns", "url", "location", "bio"]

const PUBLIC_READABLE_FIELDS = PUBLIC_WRITABLE_FIELDS.concat(["id", "avatarHash"])

const LENGTH_LIMITS = {
    name: 50,
    pronouns: 50,
    url: 100,
    location: 100,
    bio: 1000
}

const filterKeys = (input, allowed, denied) => (
    Object.keys(input).reduce((output, key) => {
        if (allowed.includes(key)) {
            output[key] = input[key]
        } else if (denied && denied.includes(key)) {
            return null
        }
        return output
    }, {})
)

router.post("/profile/@me", async (ctx) => {
    for (const field in LENGTH_LIMITS) {
        if (ctx.request.body[field] && ctx.request.body[field].length > LENGTH_LIMITS[field]) {
            ctx.throw(400, `${field} must be less than ${LENGTH_LIMITS[field]} characters`)
        }
    }

    const data = filterKeys(ctx.request.body, PUBLIC_WRITABLE_FIELDS, PUBLIC_READABLE_FIELDS)

    if (data === null) {
        ctx.throw(400, "Invalid field")
    }

    await prisma.user.update({
        where: { id: ctx.user.id },
        data
    })

    ctx.body = {
        msg: "Updated user profile"
    }
})

router.post("/profile/avatar/@me", upload.single("avatar"), async (ctx) => {
    if (!ctx.file) {
        ctx.throw(400, "No file specified")
    }

    const originalFileName = ctx.file.originalname
    const extension = originalFileName.split(".").pop()

    if (!(["png", "jpg", "jpeg", "gif"].includes(extension.toLowerCase()))) {
        ctx.throw(400, "Invalid file type")
    }

    if (ctx.request.file.size > 10 * 1024 * 1024) {
        ctx.throw(400, "File too large")
    }

    if (!ctx.request.file.mimetype.startsWith("image/")) {
        ctx.throw(400, "Invalid file type")
    }

    const avatar = ctx.request.file.buffer

    const avatarHash = crypto.createHash("sha256").update(avatar).digest("hex") + "." + extension

    minio.putObject("flowspace", avatarHash, avatar)

    await prisma.user.update({
        where: { id: ctx.user.id },
        data: { avatarHash }
    })

    ctx.body = {
        msg: "Updated user avatar",
        avatarHash
    }
})

router.get("/profile/:id", async (ctx) => {
    let user

    if (ctx.params.id === "@me") {
        user = ctx.user
    } else {
        let id

        try {
            id = BigInt(ctx.params.id)
        } catch (error) {
            ctx.throw(400, "Invalid user ID")
        }

        user = await prisma.user.findUnique({ where: { id } })
    }

    if (!user) {
        ctx.throw(404, "User not found")
    }

    ctx.body = filterKeys(user, PUBLIC_READABLE_FIELDS)
})

module.exports = router
