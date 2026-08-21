-- task_11: adiciona notification_prefs em users e movimentacao_id em notificacoes
ALTER TABLE "users" ADD COLUMN "notification_prefs" jsonb;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD COLUMN "movimentacao_id" uuid;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_movimentacao_id_movimentacoes_id_fk" FOREIGN KEY ("movimentacao_id") REFERENCES "public"."movimentacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacoes_movimentacao_id_idx" ON "notificacoes" USING btree ("movimentacao_id");
