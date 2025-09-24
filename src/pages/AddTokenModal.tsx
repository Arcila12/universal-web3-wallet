import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Button, Space, Tabs, List, Card, Typography, Spin, message } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useI18n } from '../hooks/useI18n'
import { Token } from '../wallet/TokenManager'
import TokenManager from '../wallet/TokenManager'
import { TokenInfoFetcher } from '../utils/tokenUtils'

const { Text, Title } = Typography
const { TabPane } = Tabs

interface AddTokenModalProps {
  visible: boolean
  chainId: string
  onClose: () => void
  onAdd: (token: Omit<Token, 'chainId'>) => Promise<boolean>
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({
  visible,
  chainId,
  onClose,
  onAdd
}) => {
  const { t } = useI18n()
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('popular')
  const [loading, setLoading] = useState(false)
  const [autoDetecting, setAutoDetecting] = useState(false)
  const [popularTokens, setPopularTokens] = useState<Token[]>([])
  const [tokenFetcher] = useState(() => new TokenInfoFetcher())

  useEffect(() => {
    if (visible) {
      // 加载热门Token
      const tokenManager = TokenManager.getInstance()
      const tokens = tokenManager.getPopularTokens(chainId)
      setPopularTokens(tokens)
      form.resetFields()
    }
  }, [visible, chainId, form])

  const validateEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const handleAutoDetect = async (address: string) => {
    if (!validateEthereumAddress(address)) {
      message.error(t('token.invalidTokenAddress'))
      return
    }

    setAutoDetecting(true)
    try {
      const tokenInfo = await tokenFetcher.getTokenInfo(address, chainId)

      if (tokenInfo.isValid) {
        form.setFieldsValue({
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals
        })
        message.success(t('token.autoDetectInfo'))
      } else {
        message.error(t('token.tokenNotFound'))
      }
    } catch (error) {
      console.error('Failed to detect token info:', error)
      message.error(t('token.tokenNotFound'))
    } finally {
      setAutoDetecting(false)
    }
  }

  const handleAddCustomToken = async (values: any) => {
    if (!validateEthereumAddress(values.address)) {
      message.error(t('token.invalidTokenAddress'))
      return
    }

    setLoading(true)
    try {
      const tokenData: Omit<Token, 'chainId'> = {
        address: values.address,
        name: values.name,
        symbol: values.symbol,
        decimals: values.decimals,
        isCustom: true
      }

      const success = await onAdd(tokenData)
      if (success) {
        form.resetFields()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddPopularToken = async (token: Token) => {
    setLoading(true)
    try {
      const success = await onAdd({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        isCustom: false
      })

      if (success) {
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={t('token.addToken')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={t('token.popularTokens')} key="popular">
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {popularTokens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">{t('token.noTokensFound')}</Text>
              </div>
            ) : (
              <List
                dataSource={popularTokens}
                renderItem={(token) => (
                  <List.Item>
                    <Card
                      size="small"
                      style={{ width: '100%' }}
                      bodyStyle={{ padding: '12px 16px' }}
                      hoverable
                      onClick={() => handleAddPopularToken(token)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ fontSize: '14px' }}>{token.symbol}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>{token.name}</Text>
                        </div>
                        <Button type="primary" size="small" loading={loading}>
                          {t('common.add')}
                        </Button>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </div>
        </TabPane>

        <TabPane tab={t('token.customToken')} key="custom">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddCustomToken}
          >
            <Form.Item
              name="address"
              label={t('token.tokenAddress')}
              rules={[
                { required: true, message: t('token.enterTokenAddress') },
                {
                  validator: (_, value) => {
                    if (!value || validateEthereumAddress(value)) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error(t('token.invalidTokenAddress')))
                  }
                }
              ]}
            >
              <Input
                placeholder={t('token.enterTokenAddress')}
                suffix={
                  <Button
                    type="text"
                    size="small"
                    icon={<SearchOutlined />}
                    loading={autoDetecting}
                    onClick={() => {
                      const address = form.getFieldValue('address')
                      if (address) {
                        handleAutoDetect(address)
                      }
                    }}
                  >
                    {t('token.autoDetectInfo')}
                  </Button>
                }
              />
            </Form.Item>

            <Form.Item
              name="symbol"
              label={t('token.tokenSymbol')}
              rules={[
                { required: true, message: t('token.enterTokenSymbol') },
                { max: 10, message: 'Token symbol too long' }
              ]}
            >
              <Input placeholder={t('token.enterTokenSymbol')} />
            </Form.Item>

            <Form.Item
              name="name"
              label={t('token.tokenName')}
              rules={[
                { required: true, message: t('token.enterTokenName') },
                { max: 50, message: 'Token name too long' }
              ]}
            >
              <Input placeholder={t('token.enterTokenName')} />
            </Form.Item>

            <Form.Item
              name="decimals"
              label={t('token.tokenDecimals')}
              rules={[
                { required: true, message: t('token.enterTokenDecimals') },
                { type: 'number', min: 0, max: 36, message: 'Invalid decimals' }
              ]}
            >
              <InputNumber
                placeholder={t('token.enterTokenDecimals')}
                style={{ width: '100%' }}
                min={0}
                max={36}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {t('token.addToken')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>
  )
}

export default AddTokenModal