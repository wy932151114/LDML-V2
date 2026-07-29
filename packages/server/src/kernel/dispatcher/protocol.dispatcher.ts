// ============================================================
// DZS Core Kernel — Protocol Dispatcher（协议分发器）
// 
// 协议分发器负责：
// 1. 接收引擎原始输出
// 2. 构建Protocol对象
// 3. 分发给注册的消费者（AI层/报告层/Agent）
// ============================================================

import { Injectable } from '@nestjs/common';
import type { BaziProtocol, FourPillarsProtocol } from '../../protocols/bazi.protocol';
import type { WuXingProtocol } from '../../protocols/wuxing.protocol';
import type { SolarProtocol } from '../../protocols/solar.protocol';
import type { FengShuiProtocol } from '../../protocols/fengshui.protocol';

/** 协议类型 */
export type ProtocolType = 'bazi' | 'wuxing' | 'solar' | 'fengshui' | 'ritual' | 'report';

/** 协议消费者接口 */
export interface ProtocolConsumer {
  readonly name: string;
  readonly subscribedTypes: ProtocolType[];
  onProtocol(type: ProtocolType, protocol: any): void;
}

@Injectable()
export class ProtocolDispatcher {
  private consumers: ProtocolConsumer[] = [];
  private dispatchLog: Array<{ type: ProtocolType; consumer: string; timestamp: string; protocolVersion: string }> = [];

  /**
   * 注册消费者
   */
  register(consumer: ProtocolConsumer): void {
    this.consumers.push(consumer);
  }

  /**
   * 分发协议到所有注册的消费者
   */
  dispatch(type: ProtocolType, protocol: any): void {
    const relevant = this.consumers.filter(c => c.subscribedTypes.includes(type));
    
    for (const consumer of relevant) {
      consumer.onProtocol(type, protocol);
      this.dispatchLog.push({
        type,
        consumer: consumer.name,
        timestamp: new Date().toISOString(),
        protocolVersion: protocol.version || 'unknown',
      });
    }
  }

  /**
   * 批量分发：一次分发多个协议
   */
  dispatchBatch(protocols: Array<{ type: ProtocolType; protocol: any }>): void {
    for (const { type, protocol } of protocols) {
      this.dispatch(type, protocol);
    }
  }

  /**
   * 获取分发日志
   */
  getDispatchLog() {
    return [...this.dispatchLog];
  }

  /**
   * 移除消费者
   */
  unregister(name: string): void {
    this.consumers = this.consumers.filter(c => c.name !== name);
  }
}
