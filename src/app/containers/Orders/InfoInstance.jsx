import React, { useContext, useEffect, useRef, useState } from 'react';
import { capitalizeUnderscoreText } from 'utils/common';
import {
  Form,
  InputNumber,
  Select,
  Table,
  // Switch,
  Row,
  Col,
  Button,
  Input,
} from 'antd';
import empty from 'is-empty';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectContract,
  selectData,
  selectInstance,
  selectLoading,
  selectOs,
} from './selectors';
import { actions } from './slice';
import './styles.less';
import { DiskIOPS } from './constants';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

const layout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

const EditableContext = React.createContext();

const EditableRow = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

const EditableCell = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef();
  const form = useContext(EditableContext);
  useEffect(() => {
    if (editing) {
      inputRef.current.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({
      [dataIndex]: record[dataIndex],
    });
  };

  const save = async e => {
    try {
      const values = await form.validateFields();
      toggleEdit();
      handleSave({ ...record, ...values });
    } catch (errInfo) {}
  };

  if (
    record?.name?.toUpperCase() === 'ROOT_DISK' ||
    record?.name?.toUpperCase() === 'DATA_DISK'
  )
    editable = false;

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{
          margin: 0,
        }}
        name={dataIndex}
        rules={[
          {
            required: true,
            message: `${title} is required.`,
          },
        ]}
      >
        <InputNumber
          type="number"
          min={0}
          ref={inputRef}
          onPressEnter={save}
          onBlur={save}
        />
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{
          paddingRight: 24,
        }}
        onClick={toggleEdit}
      >
        {children}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

export default function InfoInstance() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { t } = useTranslation(['translation', 'constant']);
  // const [showBuyLicense, setShowBuyLicense] = useState(false);
  // const [checkedBuyLicense, setCheckedBuyLicense] = useState(false);

  const contract = useSelector(selectContract);
  const data = useSelector(selectData);
  const dataSource = useSelector(selectInstance);

  const viewSourceInstance = () => {
    if (contract?.current?.service_type === 'POOL') {
      return dataSource?.filter(
        item =>
          item?.name?.toUpperCase().replace(' ', '_') !== 'ROOT_DISK' &&
          item?.name?.toUpperCase().replace(' ', '_') !== 'DATA_DISK',
      );
    } else {
      return dataSource?.filter(
        item => item?.name?.toUpperCase().replace(' ', '_') !== 'DISK',
      );
    }
  };

  const os = useSelector(selectOs);

  const loadingInstance = useSelector(selectLoading)?.instance;
  const loadingOs = useSelector(selectLoading)?.os;

  useEffect(() => {
    dispatch(actions.loadOs());
  }, [dispatch]);

  useEffect(() => {
    if (contract?.current) {
      dispatch(actions.loadInstance());
    }
  }, [contract, dispatch]);

  const handleChangeOs = value => {
    let name_os, amount_os;
    if (value) {
      const data_OS = { ...os?.find(item => item?.id === parseInt(value)) };
      name_os = data_OS?.name;
      amount_os =
        form.getFieldValue('os_amount') !== undefined
          ? form.getFieldValue('os_amount')
          : 0;
      // if (
      //   data_OS?.data.type?.toUpperCase() === 'WINDOWS' ||
      //   data_OS?.data.type?.toUpperCase() === 'WINDOW'
      // ) {
      // setShowBuyLicense(true);
      // setCheckedBuyLicense(true);
      // } else {
      // setShowBuyLicense(false);
      // setCheckedBuyLicense(false);
      // }
    } else {
      form.setFieldsValue({ os_amount: 0 });
      amount_os = form.getFieldValue('os_amount');
    }
    // dispatch(actions.setCurrentOs(value));
    dispatch(actions.setCurrentOs(name_os));
    dispatch(actions.setCurrentOsAmount(amount_os));
  };

  // const handleChangeBuyLicense = value => {
  //   setCheckedBuyLicense(value);
  // };

  const handleSave = row => {
    // const newData = [...dataSource];

    const newArr = viewSourceInstance();
    const newData = [...newArr];

    const index = newData.findIndex(item => row.id === item.id);
    const item = newData[index];

    newData.splice(index, 1, { ...item, ...row });

    dispatch(actions.setInstance(newData));
    dispatch(actions.setData({ ...data, items: [{ products: newData }] }));
  };

  const handleBlurOsAmount = e => {
    const value = e?.target?.value ? parseInt(e?.target?.value) : 0;
    form.setFieldsValue({ os_amount: value });
    dispatch(actions.setCurrentOsAmount(value));
  };

  const handleChangeDiskIOPS = (record, e) => {
    // const newData = [...dataSource];
    const valueIops = e !== undefined ? e : 0;
    const newArr = viewSourceInstance();
    const newData = [...newArr];
    const cloneData = newData?.map((it, index) => ({
      ...it,
      data: {
        iops: index === newData?.indexOf(record) ? valueIops : it?.data?.iops,
        volumes: it?.data?.volumes,
      },
    }));

    dispatch(actions.setInstance(cloneData));
  };

  //---------khoi tao volume disk
  const [rootVolumes, setRootVolumes] = useState([{ size: 0 }]);
  const [dataVolumes, setDataVolumes] = useState([{ size: 0 }]);
  const initialDataLoad = useRef(true);
  const initialRootLoad = useRef(true);

  // handle input change
  const handleRootVolumeValueChange = (record, i, e) => {
    const { name, value } = e?.target;
    const rootVolumeList = [...rootVolumes];
    const cloneVolumeList = rootVolumeList?.map(it => ({
      ...it,
    }));
    cloneVolumeList[i].size = parseInt(value);
    setRootVolumes(cloneVolumeList);
  };

  const handleDataVolumeValueChange = (record, i, e) => {
    const { name, value } = e?.target;
    const dataVolumeList = [...dataVolumes];
    const cloneVolumeList = dataVolumeList?.map(it => ({
      ...it,
    }));
    cloneVolumeList[i].size = parseInt(value);
    setDataVolumes(cloneVolumeList);
  };

  // handle click event of the Remove button
  const handleRemoveRootVolume = (record, i, e) => {
    const rootVolumeList = [...rootVolumes];
    rootVolumeList.splice(i, 1);
    setRootVolumes(rootVolumeList);
  };

  const handleRemoveDataVolume = (record, i, e) => {
    const dataVolumeList = [...dataVolumes];
    dataVolumeList.splice(i, 1);
    setDataVolumes(dataVolumeList);
  };

  useEffect(() => {
    if (initialDataLoad.current) {
      initialDataLoad.current = false;
      return;
    }
    let diskSize = 0;
    dataVolumes?.forEach(function (item) {
      for (const [key, value] of Object.entries(item)) {
        let temp_value = value;
        if (temp_value === '' || isNaN(temp_value)) {
          temp_value = 0;
        }
        diskSize += parseInt(temp_value);
      }
    });

    const newArr = viewSourceInstance();
    const newData = [...newArr];
    const cloneData = newData?.map((it, index) => ({
      ...it,
      data: {
        iops: it?.data?.iops,
        volumes:
          it?.name?.toUpperCase() === 'DATA_DISK'
            ? dataVolumes
            : it?.data?.volumes,
      },
      quantity:
        it?.name?.toUpperCase() === 'DATA_DISK' ? diskSize : it?.quantity,
    }));
    dispatch(actions.setInstance(cloneData));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVolumes]);

  useEffect(() => {
    if (initialRootLoad.current) {
      initialRootLoad.current = false;
      return;
    }
    let diskSize = 0;
    rootVolumes?.forEach(function (item) {
      for (const [key, value] of Object.entries(item)) {
        let temp_value = value;
        if (temp_value === '' || isNaN(temp_value)) {
          temp_value = 0;
        }
        diskSize += parseInt(temp_value);
      }
    });

    const newArr = viewSourceInstance();
    const newData = [...newArr];
    const cloneData = newData?.map((it, index) => ({
      ...it,
      data: {
        iops: it?.data?.iops,
        volumes:
          it?.name?.toUpperCase() === 'ROOT_DISK'
            ? rootVolumes
            : it?.data?.volumes,
      },
      quantity:
        it?.name?.toUpperCase() === 'ROOT_DISK' ? diskSize : it?.quantity,
    }));
    dispatch(actions.setInstance(cloneData));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootVolumes]);

  // handle click event of the Add button
  const handleAddRootVolume = (record, e) => {
    setRootVolumes([...rootVolumes, { size: 0 }]);
  };

  const handleAddDataVolume = (record, e) => {
    setDataVolumes([...dataVolumes, { size: 0 }]);
  };
  //-------------end---------------

  const dataDiskRow = record => (
    <div>
      <p>{capitalizeUnderscoreText(record?.name)}</p>
      <Form {...layout}>
        <Row key={record.id} gutter={8} justify="space-around" align="middle">
          <Form.Item name="iops" label="IOPS">
            <Row>
              <Col span={12}>
                <Select
                  // trigger={['onchange']}
                  onChange={e => handleChangeDiskIOPS(record, e)}
                  placeholder="Choose"
                  defaultValue={'5000'}
                >
                  {Object.values(DiskIOPS)?.map(item => (
                    <Option key={`${item}`} value={`${item}`}>
                      {item}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={12}>
                <Button
                  type="link"
                  onClick={e => handleAddDataVolume(record, e)}
                >
                  <PlusCircleOutlined />
                  Add Volume
                </Button>
              </Col>
            </Row>
          </Form.Item>

          <Row gutter={8} justify="space-around" align="middle">
            {dataVolumes?.length > 0 &&
              dataVolumes.map((x, i) => {
                return (
                  <>
                    <Form.Item
                      name={'data_volume_' + String(i + 1)}
                      label={'Volume ' + String(i + 1)}
                    >
                      <Row>
                        <Col span={11}>
                          <Input
                            type="number"
                            name={'data_volume'}
                            placeholder="Size"
                            value={x.size}
                            onChange={e =>
                              handleDataVolumeValueChange(record, i, e)
                            }
                          />
                        </Col>
                        <Col span={12}>
                          <Button
                            type="text"
                            danger
                            onClick={e => handleRemoveDataVolume(record, i, e)}
                          >
                            <MinusCircleOutlined />
                            Remove
                          </Button>
                        </Col>
                      </Row>
                    </Form.Item>
                  </>
                );
              })}
          </Row>
        </Row>
      </Form>
    </div>
  );

  const rootDiskRow = record => (
    <div>
      <p>{capitalizeUnderscoreText(record?.name)}</p>
      <Form {...layout}>
        <Row gutter={8} justify="space-around" align="middle">
          <Form.Item name="iops" label="IOPS">
            <Row>
              <Col span={12}>
                <Select
                  // trigger={['onchange']}
                  onChange={e => handleChangeDiskIOPS(record, e)}
                  placeholder="Choose"
                  defaultValue={'5000'}
                >
                  {Object.values(DiskIOPS)?.map(item => (
                    <Option key={`${item}`} value={`${item}`}>
                      {item}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={12}>
                <Button
                  type="link"
                  onClick={e => handleAddRootVolume(record, e)}
                >
                  <PlusCircleOutlined />
                  Add Volume
                </Button>
              </Col>
            </Row>
          </Form.Item>

          <Row key={record.id} gutter={8} justify="space-around" align="middle">
            {rootVolumes?.length > 0 &&
              rootVolumes.map((x, i) => {
                return (
                  <>
                    <Form.Item
                      name={'root_volume_' + String(i + 1)}
                      label={'Volume ' + String(i + 1)}
                    >
                      <Row>
                        <Col span={11}>
                          <Input
                            type="number"
                            name={'root_volume'}
                            placeholder="Size"
                            value={x.size}
                            onChange={e =>
                              handleRootVolumeValueChange(record, i, e)
                            }
                          />
                        </Col>
                        <Col span={12}>
                          <Button
                            type="text"
                            danger
                            onClick={e => handleRemoveRootVolume(record, i, e)}
                          >
                            <MinusCircleOutlined />
                            Remove
                          </Button>
                        </Col>
                      </Row>
                    </Form.Item>
                  </>
                );
              })}
          </Row>
        </Row>
      </Form>
    </div>
  );

  const defaultColumns = [
    {
      title: t('constant:Title.NAME'),
      key: 'name',
      // dataIndex: 'name',
      width: '40%',
      render: (text, record, index) => {
        if (
          record?.name === 'Root Disk' ||
          record?.name?.toUpperCase() === 'ROOT_DISK'
        ) {
          return rootDiskRow(record);
        } else if (
          record?.name?.toUpperCase() === 'DATA_DISK' ||
          record?.name === 'Data Disk'
        ) {
          return dataDiskRow(record);
        } else {
          return (
            <>
              {' '}
              <span> {capitalizeUnderscoreText(record?.name)}</span>
            </>
          );
        }
      },
    },
    {
      title: t('constant:Title.QUANTITY'),
      key: 'quantity',
      dataIndex: 'quantity',
      editable: true,
    },
    {
      title: t('constant:Title.UNIT'),
      key: 'unit',
      dataIndex: 'unit',
    },
  ];

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };
  const columns = defaultColumns.map(col => {
    if (!col.editable) {
      return col;
    }

    return {
      ...col,
      onCell: record => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave: handleSave,
      }),
    };
  });

  const optionOs =
    !empty(os) &&
    !loadingOs &&
    os?.map(item => (
      <Option key={`${item?.id}`} value={`${item?.id}`}>
        {item?.name}
      </Option>
    ));

  return (
    <div>
      <Table
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        pagination={false}
        dataSource={viewSourceInstance()}
        columns={columns}
        loading={loadingInstance}
      />
      <Form
        form={form}
        // labelCol={{ span: 7 }}
        // wrapperCol={{ span: 17 }}
        style={{ marginTop: 16 }}
      >
        <Row justify="space-around" gutter={[24, 24]} align="middle">
          <Col span={12}>
            <Form.Item name="os" label={t('constant:Label.OS')}>
              <Select
                onChange={handleChangeOs}
                loading={loadingOs}
                placeholder={t('Placeholder.OS')}
                allowClear
              >
                {optionOs}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="os_amount"
              label={t('constant:Title.LICENSE')}
              // initialValue={amountOS}
            >
              <InputNumber onBlur={handleBlurOsAmount} />
            </Form.Item>
          </Col>
          {/* {showBuyLicense && (
            <Col span={12}>
              <Form.Item
                name="buy_license"
                label={t('constant:Label.LICENSE')}
                valuePropName={checkedBuyLicense === true ? 'checked' : ''}
              >
                <Switch
                  onChange={handleChangeBuyLicense}
                  checkedChildren="YES"
                  unCheckedChildren="NO"
                  defaultChecked={checkedBuyLicense}
                />
              </Form.Item>
            </Col>
          )} */}
        </Row>
      </Form>
    </div>
  );
}
