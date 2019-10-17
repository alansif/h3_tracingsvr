const searchStrings = [
	{
		outputField: "MachineSerialNumber",
		chinese: "设备序列号"
	},
	{
		outputField: "Location",
		chinese: "位置"
	},
	{
		outputField: "Endoscope",
		chinese: "内镜编号"
	},
	{
		outputField: "EndoscopeType",
		chinese: "内镜型号"
	},
	{
		outputField: "InternalID",
		chinese: "内镜ID"
	},
	{
		outputField: "SerialNumber",
		chinese: "内镜序列号"
	},
	{
		outputField: "Hookup",
		chinese: "清洗接头"
	},
	{
		outputField: "ParameterSet",
		chinese: "清洗程序"
	},
	{
		outputField: "CycleNumber",
		chinese: "循环次数",
	},
	{
		outputField: "CycleCompletionDate",
		chinese: "循环完成日期",
	},
	{
		outputField: "OperatorLoading",
		chinese: "装入操作人"
	},
	{
		outputField: "OperatorUnloading",
		chinese: "取出操作人"
	},
	{
		outputField: "MRCValidation",
		chinese: "消毒液浓度测试"
	},
	{
		outputField: "CYCLE",
		chinese: "循环状态"
	},
	{
		outputField: "TimeBegin",
		chinese: "开始时间"
	},
	{
		outputField: "TimeEnd",
		chinese: "结束时间"
	},
	{
		outputField: "Category",
		chinese: "洗消分类"
	}
];

exports.fieldNames = searchStrings.reduce((acc,cur)=>{acc[cur.outputField]=cur.chinese;return acc;},{});
