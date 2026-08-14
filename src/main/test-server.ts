import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { BrowserWindow } from 'electron';
import { logger } from './logger';
import { getVidoLogDir } from './paths';

// 测试服务器实例
let testServer: express.Application | null = null;
let commandQueue: Array<{
  id: number;
  type: string;
  data: any;
  timestamp: string;
}> = [];
let commandIdCounter = 0;

export function startTestServer(win: BrowserWindow | null) {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.VITE_DEV_SERVER_URL
  ) {
    testServer = express();
    testServer.use(express.json());
    testServer.use(cors());

    // 健康检查接口
    testServer.get('/api/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // 获取指令队列接口
    testServer.get('/api/commands', (req: Request, res: Response) => {
      res.json({
        success: true,
        commands: commandQueue.slice(-1), // 只返回最新的指令
        timestamp: new Date().toISOString(),
      });
    });

    // 获取日志接口
    testServer.get('/api/logs', (req: Request, res: Response) => {
      try {
        const logDir = getVidoLogDir();
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        const logFile = path.join(logDir, `vido-${dateString}.log`);

        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf8');
          const logLines = logContent.split('\n').filter((line) => line.trim());
          const recentLogs = logLines.slice(-50); // 返回最近50行日志

          res.json({
            success: true,
            logFile: logFile,
            totalLines: logLines.length,
            recent: recentLogs,
            timestamp: new Date().toISOString(),
          });
        } else {
          res.json({
            success: true,
            logFile: logFile,
            totalLines: 0,
            recent: [],
            message: 'Log file not found',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 获取日志统计接口
    testServer.get('/api/stats', (req: Request, res: Response) => {
      try {
        const logDir = getVidoLogDir();
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        const logFile = path.join(logDir, `vido-${dateString}.log`);

        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          const logContent = fs.readFileSync(logFile, 'utf8');
          const logLines = logContent.split('\n').filter((line) => line.trim());

          res.json({
            success: true,
            logFile: logFile,
            fileSize: stats.size,
            totalLines: logLines.length,
            lastModified: stats.mtime,
            timestamp: new Date().toISOString(),
          });
        } else {
          res.json({
            success: true,
            logFile: logFile,
            fileSize: 0,
            totalLines: 0,
            lastModified: null,
            message: 'Log file not found',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 发送键盘事件接口
    testServer.post('/api/key/:key', (req: Request, res: Response) => {
      const key = req.params.key;

      try {
        logger.info('TestServer', `接收键盘指令: ${key}`);

        const command = {
          id: ++commandIdCounter,
          type: 'key',
          data: { key },
          timestamp: new Date().toISOString(),
        };

        commandQueue.push(command);
        if (commandQueue.length > 10) {
          commandQueue = commandQueue.slice(-10);
        }

        // 通过IPC发送到渲染进程
        let sent = false;
        if (win && win.webContents) {
          win.webContents.send('test-keyboard-event', { key });
          sent = true;
          logger.info(
            'TestServer',
            `IPC事件已发送: test-keyboard-event, key=${key}`
          );
        }

        res.json({
          success: true,
          message: `键盘指令 '${key}' 已发送`,
          commandId: command.id,
          timestamp: command.timestamp,
          ipcSent: sent,
        });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, error: (error as Error).message });
      }
    });

    // 发送键盘序列接口
    testServer.post('/api/sequence', (req: Request, res: Response) => {
      const { keys } = req.body;

      if (!Array.isArray(keys)) {
        return res.status(400).json({
          success: false,
          error: '需要提供键序列数组',
        });
      }

      try {
        logger.info('TestServer', `接收键盘序列: ${keys.join(', ')}`);

        const command = {
          id: ++commandIdCounter,
          type: 'sequence',
          data: { keys },
          timestamp: new Date().toISOString(),
        };

        commandQueue.push(command);
        if (commandQueue.length > 10) {
          commandQueue = commandQueue.slice(-10);
        }

        // 通过IPC发送到渲染进程
        let sent = false;
        if (win && win.webContents) {
          win.webContents.send('test-keyboard-sequence', { keys });
          sent = true;
          logger.info(
            'TestServer',
            `IPC序列已发送: test-keyboard-sequence, keys=${keys.join(', ')}`
          );
        }

        res.json({
          success: true,
          message: `键盘序列已发送: ${keys.join(', ')}`,
          commandId: command.id,
          timestamp: command.timestamp,
          ipcSent: sent,
        });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, error: (error as Error).message });
      }
    });

    testServer.listen(3002, () => {
      logger.info(
        'TestServer',
        '集成测试API服务器已启动: http://localhost:3002'
      );
    });
  }
}

export function stopTestServer() {
  if (testServer) {
    logger.info('TestServer', '正在关闭测试API服务器');
    // Express服务器没有直接的close方法，但我们可以记录状态
    testServer = null;
  }
}
