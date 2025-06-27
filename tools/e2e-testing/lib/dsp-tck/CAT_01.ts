import { PipelineExecutor } from "../pipeline.executor.js";

export async function CAT_01_01(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor.newPipeline("CAT0101").execute();
}
export async function CAT_01_02(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor.newPipeline("CAT0102").execute();
}
export async function CAT_01_03(pipelineExecutor: PipelineExecutor) {
  return await pipelineExecutor.newPipeline("CAT9999").execute();
}
