import type {
  ProjectAgreementDetailDto,
  ProjectAgreementDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import http from "@tsg-dsp/common-ui/utils/http.js";

export class ProjectAgreementsService {
  private static readonly BASE_PATH = "/management/project-agreements";

  static async getAll(): Promise<ProjectAgreementDetailDto[]> {
    const response = await http.get<ProjectAgreementDetailDto[]>(
      this.BASE_PATH
    );
    return response.data;
  }

  static async create(
    projectAgreement: ProjectAgreementDto
  ): Promise<ProjectAgreementDetailDto> {
    const response = await http.post<ProjectAgreementDetailDto>(
      this.BASE_PATH,
      projectAgreement
    );
    return response.data;
  }

  static async sign(id: number): Promise<void> {
    await http.post(`${this.BASE_PATH}/${id}/sign`);
  }

  static async linkDataset(
    projectAgreementId: number,
    datasetId: string
  ): Promise<void> {
    await http.post(
      `${this.BASE_PATH}/${projectAgreementId}/link/${datasetId}`
    );
  }

  static async unlinkDataset(
    projectAgreementId: number,
    datasetId: string
  ): Promise<void> {
    await http.post(
      `${this.BASE_PATH}/${projectAgreementId}/unlink/${datasetId}`
    );
  }
}
