import type { Express } from 'express'
import request from 'supertest'
import type TestAgent from 'supertest/lib/agent'
import { create, shutdown } from './index'

describe('API', () => {
	let app: Express
	let req: TestAgent

	beforeAll(async () => {
		app = await create()

		// TODO - custom port
		req = request('http://localhost:3000')
		// req = request(app)

		// await listen(app, 9123)
		// req = request('http://localhost:9123')
	})

	afterAll(async () => {
		await shutdown()
	})

	describe('GET /', () => {
		it('should return the documentation page', (done) => {
			req.get('/')
				.expect('Content-Type', 'text/html; charset=utf-8')
				.expect(200)
				.expect((res) => {
					expect(res.text).toContain('Boss Fight API')
				})
				.end(done)
		})
	})
})
