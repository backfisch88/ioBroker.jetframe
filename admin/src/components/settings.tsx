import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import type { CreateCSSProperties } from '@material-ui/core/styles/withStyles';
import TextField from '@material-ui/core/TextField';
import Input from '@material-ui/core/Input';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import I18n from '@iobroker/adapter-react/i18n';

const styles = (): Record<string, CreateCSSProperties> => ({
	input: {
		marginTop: 0,
		minWidth: 500,
	},
	controlElement: {
		marginBottom: 10,
	},
});

interface SettingsProps {
	classes: Record<string, string>;
	native: Record<string, any>;
	onChange: (attr: string, value: any) => void;
}

interface SettingsState {
	dummy?: undefined;
}

class Settings extends React.Component<SettingsProps, SettingsState> {
	constructor(props: SettingsProps) {
		super(props);
		this.state = {};
	}

	renderInput(title: AdminWord, attr: string, type: string): React.JSX.Element {
		return (
			<TextField
				label={I18n.t(title)}
				className={`${this.props.classes.input} ${this.props.classes.controlElement}`}
				value={this.props.native[attr] || ''}
				type={type || 'text'}
				onChange={e => this.props.onChange(attr, e.target.value)}
				margin="normal"
				fullWidth
			/>
		);
	}

	renderSelect(
		title: AdminWord,
		attr: string,
		options: { value: string; title: AdminWord }[],
	): React.JSX.Element {
		return (
			<FormControl className={`${this.props.classes.input} ${this.props.classes.controlElement}`}>
				<Select
					value={this.props.native[attr] || 'browser'}
					onChange={e => this.props.onChange(attr, e.target.value)}
					input={<Input name={attr} id={`${attr}-helper`} />}
				>
					{options.map(item => (
						<MenuItem key={item.value} value={item.value}>
							{I18n.t(item.title)}
						</MenuItem>
					))}
				</Select>
				<FormHelperText>{I18n.t(title)}</FormHelperText>
			</FormControl>
		);
	}

	render(): React.JSX.Element {
		return (
			<form>
				{this.renderSelect('speechMode', 'speechMode', [
					{ value: 'browser', title: 'speechModeBrowser' },
					{ value: 'external', title: 'speechModeExternal' },
					{ value: 'both', title: 'speechModeBoth' },
					{ value: 'off', title: 'speechModeOff' },
				])}

				<br />

				{this.renderInput('speechTemplate', 'speechTemplate', 'text')}
			</form>
		);
	}
}

export default withStyles(styles)(Settings);
