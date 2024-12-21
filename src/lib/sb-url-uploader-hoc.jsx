import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, intlShape, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import log from '../lib/log';

import {
    LoadingStates,
    getIsLoadingUpload,
    getIsShowingWithoutId,
    onLoadedProject,
    requestProjectUpload
} from '../reducers/project-state';
import {setProjectTitle} from '../reducers/project-title';
import {
    openLoadingProject,
    closeLoadingProject
} from '../reducers/modals';
import {
    closeFileMenu
} from '../reducers/menus';

const messages = defineMessages({
    loadError: {
        id: 'gui.projectLoader.loadError',
        defaultMessage: 'The project file that was selected failed to load.',
        description: 'An error that displays when a local project file fails to load.'
    }
});

/**
 * Higher Order Component to provide behavior for loading project files from a URL into the editor.
 * @param {React.Component} WrappedComponent the component to add project file loading functionality to
 * @returns {React.Component} WrappedComponent with project file loading functionality added
 *
 * <SBURLUploaderHOC>
 *     <WrappedComponent />
 * </SBURLUploaderHOC>
 */
const SBURLUploaderHOC = function (WrappedComponent) {
    class SBURLUploaderComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'loadProjectFromURL',
                'handleFinishedLoadingUpload',
                'promptForURLAndLoadProject',
                'handleStartSelectingURLUpload'
            ]);
        }

        componentDidMount () {
            window.handleStartSelectingURLUpload = this.handleStartSelectingURLUpload.bind(this);
        }

        componentDidUpdate (prevProps) {
            if (this.props.isLoadingUpload && !prevProps.isLoadingUpload) {
                this.handleFinishedLoadingUpload(); // cue step 5 below
            }
        }

        componentWillUnmount () {
            this.removeFileObjects();
        }

        handleStartSelectingURLUpload () {
            this.promptForURLAndLoadProject(); // go to step 2
        }

        // Method to prompt user for URL and load project
        promptForURLAndLoadProject () {
            // eslint-disable-next-line no-alert
            const url = window.prompt('Please enter the project URL:');
            if (url) {
                this.loadProjectFromURL(url);
            }
        }

        // Method to load project from URL
        loadProjectFromURL (url) {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.arrayBuffer();
                })
                .then(buffer => {
                    this.fileToUpload = buffer;
                    this.handleFinishedLoadingUpload();
                })
                .catch(error => {
                    log.warn(error);
                    alert(this.props.intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
                });
        }

        handleFinishedLoadingUpload () {
            if (this.fileToUpload) {
                this.props.onLoadingStarted();
                const filename = 'project.sb3';
                let loadingSuccess = false;
                this.props.vm.loadProject(this.fileToUpload)
                    .then(() => {
                        if (filename) {
                            const uploadedProjectTitle = this.getProjectTitleFromFilename(filename);
                            this.props.onSetProjectTitle(uploadedProjectTitle);
                        }
                        loadingSuccess = true;
                    })
                    .catch(error => {
                        log.warn(error);
                        alert(this.props.intl.formatMessage(messages.loadError)); // eslint-disable-line no-alert
                    })
                    .then(() => {
                        this.props.onLoadingFinished(this.props.loadingState, loadingSuccess);
                        this.removeFileObjects();
                    });
            }
        }

        getProjectTitleFromFilename (fileInputFilename) {
            if (!fileInputFilename) return '';
            const matches = fileInputFilename.match(/^(.*)\.sb[23]?$/);
            if (!matches) return '';
            return matches[1].substring(0, 100);
        }

        removeFileObjects () {
            this.fileToUpload = null;
        }

        render () {
            const {
                /* eslint-disable no-unused-vars */
                cancelFileUpload,
                closeFileMenu: closeFileMenuProp,
                isLoadingUpload,
                isShowingWithoutId,
                loadingState,
                onLoadingFinished,
                onLoadingStarted,
                onSetProjectTitle,
                projectChanged,
                requestProjectUpload: requestProjectUploadProp,
                userOwnsProject,
                /* eslint-enable no-unused-vars */
                ...componentProps
            } = this.props;
            return (
                <React.Fragment>
                    <WrappedComponent
                        onStartSelectingURLUpload={this.handleStartSelectingURLUpload}
                        {...componentProps}
                    />
                </React.Fragment>
            );
        }
    }

    SBURLUploaderComponent.propTypes = {
        canSave: PropTypes.bool,
        cancelFileUpload: PropTypes.func,
        closeFileMenu: PropTypes.func,
        intl: intlShape.isRequired,
        isLoadingUpload: PropTypes.bool,
        isShowingWithoutId: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onLoadingFinished: PropTypes.func,
        onLoadingStarted: PropTypes.func,
        onSetProjectTitle: PropTypes.func,
        projectChanged: PropTypes.bool,
        requestProjectUpload: PropTypes.func,
        userOwnsProject: PropTypes.bool,
        vm: PropTypes.shape({
            loadProject: PropTypes.func
        })
    };

    const mapStateToProps = (state, ownProps) => {
        const loadingState = state.scratchGui.projectState.loadingState;
        const user = state.session && state.session.session && state.session.session.user;
        return {
            isLoadingUpload: getIsLoadingUpload(loadingState),
            isShowingWithoutId: getIsShowingWithoutId(loadingState),
            loadingState: loadingState,
            projectChanged: state.scratchGui.projectChanged,
            userOwnsProject: ownProps.authorUsername && user &&
                (ownProps.authorUsername === user.username),
            vm: state.scratchGui.vm
        };
    };

    const mapDispatchToProps = (dispatch, ownProps) => ({
        cancelFileUpload: loadingState => dispatch(onLoadedProject(loadingState, false, false)),
        closeFileMenu: () => dispatch(closeFileMenu()),
        onLoadingFinished: (loadingState, success) => {
            dispatch(onLoadedProject(loadingState, ownProps.canSave, success));
            dispatch(closeLoadingProject());
            dispatch(closeFileMenu());
        },
        onLoadingStarted: () => dispatch(openLoadingProject()),
        onSetProjectTitle: title => dispatch(setProjectTitle(title)),
        requestProjectUpload: loadingState => dispatch(requestProjectUpload(loadingState))
    });

    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );

    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(SBURLUploaderComponent));
};

export {
    SBURLUploaderHOC as default
};
