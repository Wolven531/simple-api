/**
 * This function logs messages to console with a timestamp
 *
 * @param { string } msg
 * @param { boolean | undefined } isError
 */
export const log = (msg: string, isError = false) => {
	const d = new Date().toUTCString()

	if (isError) {
		console.error(`[${d}] ${msg}`)
		return
	}

	console.info(`[${d}] ${msg}`)
}
