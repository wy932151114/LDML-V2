// ============================================================
// 道之自然·命理AI系统 — Jiugong模块：控制器
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { JiugongService } from './jiugong.service';

@Controller('jiugong')
export class JiugongController {
  constructor(private readonly service: JiugongService) {}
}
