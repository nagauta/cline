import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler } from "../"
import { ApiHandlerOptions, ModelInfo, RaycastAIModelId, raycastAIModels, raycastAIDefaultModelId } from "../../shared/api"
import { ApiStream } from "../transform/stream"
import { askAI } from "./raycast-ai-sdk"

export class RaycastAIHandler implements ApiHandler {
	private options: ApiHandlerOptions

	constructor(options: ApiHandlerOptions) {
		this.options = options
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		// メッセージを整形してプロンプトを作成
		const formattedPrompt = this.formatMessages(systemPrompt, messages)

		try {
			// RaycastのaskAI関数を呼び出し
			const result = await askAI(formattedPrompt)

			// 完全な結果を一度に返す
			yield {
				type: "text",
				text: result,
			}
		} catch (error) {
			console.error("RaycastAI API error:", error)
			throw new Error(`RaycastAI API error: ${error.message}`)
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		const modelId = this.options.raycastModelId
		if (modelId && modelId in raycastAIModels) {
			const id = modelId as RaycastAIModelId
			return { id, info: raycastAIModels[id as keyof typeof raycastAIModels] }
		}
		return {
			id: raycastAIDefaultModelId,
			info: raycastAIModels[raycastAIDefaultModelId as keyof typeof raycastAIModels],
		}
	}

	/**
	 * Anthropicメッセージ形式をRaycastAI用のプロンプトに変換
	 */
	private formatMessages(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): string {
		let prompt = `${systemPrompt}\n\n`

		for (const message of messages) {
			const role = message.role === "user" ? "User" : "Assistant"

			if (typeof message.content === "string") {
				prompt += `${role}: ${message.content}\n\n`
			} else {
				// 複合コンテンツの処理
				let messageContent = ""

				for (const content of message.content) {
					if (content.type === "text") {
						messageContent += content.text + "\n"
					}
					// 画像や他のコンテンツタイプは現在サポートされていないためスキップ
				}

				prompt += `${role}: ${messageContent.trim()}\n\n`
			}
		}

		return prompt
	}
}
