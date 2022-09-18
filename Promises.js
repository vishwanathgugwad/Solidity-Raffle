function callbackUsing() {
    return new Promise((resolve, reject) => {
        let a = 1 + 1
        if (a == 2) {
            resolve("success")
        } else {
            reject("failed")
        }
    })
}
callbackUsing()
    .then((message) => {
        console.log(message)
    })
    .catch((error) => {
        console.log(error)
    })

function callbackTest(callback, revert) {
    let a = 10
    if (5 > 10) {
        callback("successfull", a)
    } else {
        revert({
            name: "noneed",
            reason: "unknown",
        })
    }
}
callbackTest(
    (message, value) => {
        console.log(`message as value is ${value}`)
    },
    (error) => {
        console.log(error.reason)
    }
)
