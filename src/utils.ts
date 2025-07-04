
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(array: Array<string>, size: number) {
    const chunks = [];
    let index = 0;
    while (index < array.length) {
        chunks.push(array.slice(index, index + size));
        index += size;
    }
    return chunks;
}

export {
    sleep, chunkArray
}